import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";

import {
  mapAiInsightRowToStored,
  readLiveInsightFromStore,
  readPrematchInsightFromStore,
  withLiveInsightLock,
  withPrematchInsightLock,
  writeLiveInsightCache,
  writePrematchInsightCache,
} from "@/lib/ai/cache";
import {
  insertAiInsight,
  readLatestLiveInsight,
  readLatestPrematchInsight,
} from "@/lib/ai/db";
import type { Json } from "@/types/supabase";
import {
  generateLiveStructuredInsight,
  generatePrematchStructuredInsight,
  OpenAiGenerationError,
  OpenAiNotConfiguredError,
} from "@/lib/ai/openai";
import {
  liveLlmToNarrativePayload,
  prematchLlmToNarrativePayload,
} from "@/lib/ai/compose-prematch-commentary";
import { toUserFacingAiErrorMessage } from "@/lib/ai/user-facing-ai-error";
import {
  buildPrematchSystemPrompt,
  buildLiveSystemPrompt,
} from "@/lib/ai/prompts";
import { mergeNarrativeWithPrediction } from "@/lib/ai/merge-insight";
import type {
  LiveInsightResponse,
  PrematchInsightMode,
  PrematchInsightResponse,
} from "@/lib/ai/schemas";
import { validateAIInsightPayload } from "@/lib/ai/schemas";
import { canGeneratePrematchNarrative } from "@/lib/ai/prematch-availability";
import {
  canBackfillMissingPrematchInsight,
  canGeneratePrematchInsight,
  historicalPrematchWriteAction,
  resolveFixturePhase,
} from "@/lib/ai/status-map";
import {
  AiLimitReachedError,
  assertCanGenerateAi,
  getAiDailyLimit,
  getAiUsageStatus,
  recordAiGeneration,
} from "@/lib/ai/usage-gate";
import {
  getActiveModelVersion,
  mapLivePredictionRowToResult,
  readLatestLivePrediction,
  readLivePredictionById,
  resolveFixtureUuidByExternalId,
} from "@/lib/predictions/db";
import type { MeaningfulEventKind } from "@/lib/live/event-detector-types";
import type { LivePredictionResult } from "@/types/prediction";
import {
  buildLiveContext,
  buildLiveUserPrompt,
  buildPrematchContext,
  buildPrematchUserPrompt,
} from "@/lib/services/aiContextService";
import {
  getLatestPrematch,
  getOrComputePrematch,
} from "@/lib/services/predictionService";

export type GeneratePrematchInsightOptions = {
  userId?: string | null;
  trigger: "user" | "cron";
};

function reportPrematchInsightOutcome(
  outcome: "unavailable" | "fallback",
  fixtureExternalId: number,
  extra: Record<string, unknown>
): void {
  Sentry.captureMessage(`prematch_insight_${outcome}`, {
    level: outcome === "fallback" ? "warning" : "info",
    extra: {
      fixtureExternalId,
      ...extra,
    },
  });
}

function buildFallbackResponse(
  fixtureExternalId: number,
  prediction: NonNullable<Awaited<ReturnType<typeof getOrComputePrematch>>>,
  message: string
): PrematchInsightResponse {
  return {
    status: "FALLBACK",
    fixtureExternalId,
    prediction,
    message,
  };
}

async function readHistoricalPrematchInsight(
  fixtureUuid: string,
  fixtureExternalId: number
): Promise<PrematchInsightResponse> {
  const row = await readLatestPrematchInsight(fixtureUuid);
  if (!row) {
    const prediction = await getLatestPrematch(fixtureExternalId);
    if (prediction) {
      return { status: "MISS", fixtureExternalId, prediction };
    }

    return { status: "MISS", fixtureExternalId };
  }

  const prediction = await getLatestPrematch(fixtureExternalId);
  if (!prediction) {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "NO_STORED_INSIGHT",
    };
  }

  return {
    status: "OK",
    insight: mapAiInsightRowToStored(row, fixtureExternalId, true),
    prediction,
    cached: true,
    insightMode: "historical",
  };
}

async function resolveLivePredictionForInsight(input: {
  fixtureUuid: string;
  fixtureExternalId: number;
  predictionId: string | null;
}): Promise<LivePredictionResult | null> {
  const modelVersion = await getActiveModelVersion();

  if (input.predictionId) {
    const linked = await readLivePredictionById(input.predictionId);
    if (linked) {
      return mapLivePredictionRowToResult(
        linked,
        input.fixtureExternalId,
        modelVersion.version,
        true
      );
    }
  }

  const latest = await readLatestLivePrediction(input.fixtureUuid);
  if (!latest) {
    return null;
  }

  return mapLivePredictionRowToResult(
    latest,
    input.fixtureExternalId,
    modelVersion.version,
    true
  );
}

export async function readLiveInsight(
  fixtureExternalId: number
): Promise<LiveInsightResponse> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return { status: "MISS", fixtureExternalId };
  }

  const phase = resolveFixturePhase(fixture.status);
  if (phase !== "LIVE") {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "NOT_LIVE",
    };
  }

  const row = await readLatestLiveInsight(fixture.id);
  if (!row) {
    return { status: "MISS", fixtureExternalId };
  }

  const stored = mapAiInsightRowToStored(row, fixtureExternalId, true);
  await writeLiveInsightCache(fixtureExternalId, row.context_hash, stored);

  const prediction = await resolveLivePredictionForInsight({
    fixtureUuid: fixture.id,
    fixtureExternalId,
    predictionId: row.prediction_id,
  });

  return {
    status: "OK",
    insight: stored,
    prediction,
    cached: true,
    insightMode: "live",
  };
}

export async function readPrematchInsight(
  fixtureExternalId: number
): Promise<PrematchInsightResponse> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return { status: "MISS", fixtureExternalId };
  }

  const phase = resolveFixturePhase(fixture.status);

  if (phase === "NEITHER") {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "FIXTURE_NOT_ANALYZABLE",
    };
  }

  if (phase === "LIVE" || phase === "FINISHED") {
    return readHistoricalPrematchInsight(fixture.id, fixtureExternalId);
  }

  const prediction = await getOrComputePrematch(fixtureExternalId);
  if (!prediction) {
    return { status: "MISS", fixtureExternalId };
  }

  const { contextHash } = await buildPrematchContext(
    fixtureExternalId,
    prediction
  );
  const stored = await readPrematchInsightFromStore(
    fixture.id,
    fixtureExternalId,
    contextHash
  );

  if (!stored) {
    return { status: "MISS", fixtureExternalId, prediction };
  }

  return {
    status: "OK",
    insight: stored,
    prediction,
    cached: true,
    insightMode: "prematch",
  };
}

/**
 * Pre-match insight: one row per (fixture_id, PREMATCH, context_hash), shared by all users.
 * Personal daily quota does not gate creation or reads; cron and authenticated ensure fill gaps.
 * After kickoff, a signed-in open may create the first row once. Later hash changes do not.
 */
export async function generatePrematchInsight(
  fixtureExternalId: number,
  options: GeneratePrematchInsightOptions
): Promise<PrematchInsightResponse> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return { status: "MISS", fixtureExternalId };
  }

  const phase = resolveFixturePhase(fixture.status);
  const insightMode: PrematchInsightMode = canBackfillMissingPrematchInsight(
    fixture.status
  )
    ? "historical"
    : "prematch";

  if (phase === "NEITHER") {
    reportPrematchInsightOutcome("unavailable", fixtureExternalId, {
      reason: "FIXTURE_NOT_ANALYZABLE",
      trigger: options.trigger,
      fixtureStatus: fixture.status,
    });
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "FIXTURE_NOT_ANALYZABLE",
    };
  }

  if (insightMode === "historical") {
    const stored = await readLatestPrematchInsight(fixture.id);
    const action = historicalPrematchWriteAction({
      trigger: options.trigger,
      hasUserId: Boolean(options.userId),
      hasStoredPrematch: stored != null,
    });

    if (action === "return_stored" && stored) {
      const prediction =
        (await getLatestPrematch(fixtureExternalId)) ??
        (await getOrComputePrematch(fixtureExternalId));
      if (!prediction) {
        return { status: "MISS", fixtureExternalId };
      }

      return {
        status: "OK",
        insight: mapAiInsightRowToStored(stored, fixtureExternalId, true),
        prediction,
        cached: true,
        insightMode: "historical",
      };
    }

    if (action === "guest_forbidden") {
      return { status: "GUEST_FORBIDDEN" };
    }

    if (action === "generation_not_allowed") {
      reportPrematchInsightOutcome("unavailable", fixtureExternalId, {
        reason: "GENERATION_NOT_ALLOWED",
        trigger: options.trigger,
        fixtureStatus: fixture.status,
      });
      return {
        status: "UNAVAILABLE",
        fixtureExternalId,
        reason: "GENERATION_NOT_ALLOWED",
      };
    }
  } else if (!canGeneratePrematchInsight(fixture.status)) {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "GENERATION_NOT_ALLOWED",
    };
  }

  const prediction = await getOrComputePrematch(fixtureExternalId);
  if (!prediction) {
    return { status: "MISS", fixtureExternalId };
  }

  const snapshot = prediction.inputSnapshot;
  if (!snapshot || !canGeneratePrematchNarrative(snapshot, prediction)) {
    reportPrematchInsightOutcome("unavailable", fixtureExternalId, {
      reason: "GENERATION_NOT_ALLOWED",
      trigger: options.trigger,
      fixtureStatus: fixture.status,
      detail: snapshot ? "insufficient_model_signal" : "missing_input_snapshot",
    });
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "GENERATION_NOT_ALLOWED",
    };
  }

  const { context, contextHash } = await buildPrematchContext(
    fixtureExternalId,
    prediction
  );

  const existing = await readPrematchInsightFromStore(
    fixture.id,
    fixtureExternalId,
    contextHash
  );
  if (existing) {
    return {
      status: "OK",
      insight: existing,
      prediction,
      cached: true,
      insightMode,
    };
  }

  if (options.trigger === "user" && !options.userId) {
    return { status: "GUEST_FORBIDDEN" };
  }

  try {
    const generated = await withPrematchInsightLock(
      fixtureExternalId,
      async () => {
        if (insightMode === "historical") {
          const latest = await readLatestPrematchInsight(fixture.id);
          if (latest) {
            return mapAiInsightRowToStored(latest, fixtureExternalId, true);
          }
        }

        const cachedInsideLock = await readPrematchInsightFromStore(
          fixture.id,
          fixtureExternalId,
          contextHash
        );
        if (cachedInsideLock) {
          return cachedInsideLock;
        }

        const llm = await generatePrematchStructuredInsight({
          systemPrompt: buildPrematchSystemPrompt(),
          userPrompt: buildPrematchUserPrompt(context),
        });

        const narrative = prematchLlmToNarrativePayload(llm.parsed);

        const payload = validateAIInsightPayload(
          mergeNarrativeWithPrediction(narrative, prediction, {
            dataAvailable: context.dataAvailable,
            dataMissing: context.dataMissing,
          })
        );

        const row = await insertAiInsight({
          fixtureUuid: fixture.id,
          predictionId: prediction.predictionId,
          contextHash,
          openaiModel: llm.model,
          promptVersion: context.promptVersion,
          payload,
          rawOutput: {
            narrative: llm.parsed,
            analysis: llm.parsed.analysis,
            dataUsed: llm.parsed.dataUsed,
            dataCoverage: {
              dataAvailable: context.dataAvailable,
              dataMissing: context.dataMissing,
            },
          } as Json,
          tokensInput: llm.tokensInput,
          tokensOutput: llm.tokensOutput,
          costUsd: llm.costUsd,
        });

        const stored = mapAiInsightRowToStored(row, fixtureExternalId, false);
        await writePrematchInsightCache(fixtureExternalId, contextHash, stored);
        return stored;
      }
    );

    return {
      status: "OK",
      insight: generated,
      prediction,
      cached: generated.cached,
      insightMode,
    };
  } catch (error) {
    console.error("[aiService] prematch generation failed:", error);
    reportPrematchInsightOutcome("fallback", fixtureExternalId, {
      trigger: options.trigger,
      message: toUserFacingAiErrorMessage(error),
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return buildFallbackResponse(
      fixtureExternalId,
      prediction,
      toUserFacingAiErrorMessage(error)
    );
  }
}

export async function getPrematchInsightQuota(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  return getAiUsageStatus(userId);
}

export { getAiDailyLimit };

export type GenerateLiveInsightInput = {
  fixtureExternalId: number;
  prediction: LivePredictionResult;
  meaningfulTriggers: MeaningfulEventKind[];
  minute: number | null;
  score: { home: number | null; away: number | null };
  liveStats: import("@/types/ai").LiveAiContext["liveStats"];
  /** When set, free-tier live quotas are enforced for this generation. */
  userId?: string | null;
};

export type GenerateLiveInsightResult =
  | { ok: true; contextHash: string; cached: boolean }
  | { ok: false; reason: string };

/** LIVE insights are append-only: one new row per distinct context_hash. */
export async function generateLiveInsight(
  input: GenerateLiveInsightInput
): Promise<GenerateLiveInsightResult> {
  const fixture = await resolveFixtureUuidByExternalId(input.fixtureExternalId);
  if (!fixture) {
    return { ok: false, reason: "FIXTURE_NOT_FOUND" };
  }

  const { context, contextHash } = await buildLiveContext({
    fixtureExternalId: input.fixtureExternalId,
    prediction: input.prediction,
    meaningfulTriggers: input.meaningfulTriggers,
    minute: input.minute,
    score: input.score,
    liveStats: input.liveStats,
  });

  const existing = await readLiveInsightFromStore(
    fixture.id,
    input.fixtureExternalId,
    contextHash
  );
  if (existing) {
    return { ok: true, contextHash, cached: true };
  }

  if (input.userId) {
    try {
      await assertCanGenerateAi(input.userId, "live_interval", {
        fixtureUuid: fixture.id,
      });
      await assertCanGenerateAi(input.userId, "live_match", {
        fixtureUuid: fixture.id,
      });
    } catch (error) {
      if (error instanceof AiLimitReachedError) {
        return {
          ok: false,
          reason: error.code,
        };
      }
      throw error;
    }
  }

  try {
    await withLiveInsightLock(input.fixtureExternalId, async () => {
      const cachedInsideLock = await readLiveInsightFromStore(
        fixture.id,
        input.fixtureExternalId,
        contextHash
      );
      if (cachedInsideLock) {
        return cachedInsideLock;
      }

      const llm = await generateLiveStructuredInsight({
        systemPrompt: buildLiveSystemPrompt(),
        userPrompt: buildLiveUserPrompt(context),
      });

      const narrative = liveLlmToNarrativePayload(llm.parsed);

      const payload = validateAIInsightPayload(
        mergeNarrativeWithPrediction(narrative, input.prediction, {
          dataAvailable: context.dataAvailable,
          dataMissing: context.dataMissing,
        })
      );

      const row = await insertAiInsight({
        fixtureUuid: fixture.id,
        predictionId: input.prediction.predictionId,
        contextHash,
        openaiModel: llm.model,
        promptVersion: context.promptVersion,
        payload,
        rawOutput: {
          narrative: llm.parsed,
          analysis: llm.parsed.analysis,
          dataUsed: llm.parsed.dataUsed,
          dataCoverage: {
            dataAvailable: context.dataAvailable,
            dataMissing: context.dataMissing,
          },
        } as Json,
        tokensInput: llm.tokensInput,
        tokensOutput: llm.tokensOutput,
        costUsd: llm.costUsd,
        type: "LIVE",
      });

      const stored = mapAiInsightRowToStored(
        row,
        input.fixtureExternalId,
        false
      );
      await writeLiveInsightCache(input.fixtureExternalId, contextHash, stored);
      return stored;
    });

    if (input.userId) {
      await recordAiGeneration(input.userId, "live_match", {
        fixtureUuid: fixture.id,
      });
    }

    return { ok: true, contextHash, cached: false };
  } catch (error) {
    if (
      error instanceof OpenAiNotConfiguredError ||
      error instanceof OpenAiGenerationError ||
      error instanceof ZodError
    ) {
      const message =
        error instanceof ZodError
          ? "Live insight failed narrative validation"
          : error.message;
      console.error("[aiService] live generation failed:", message);
      Sentry.captureMessage("live_insight_generation_failed", {
        level: "warning",
        extra: {
          fixtureExternalId: input.fixtureExternalId,
          errorName: error.name,
          message,
        },
      });
      return { ok: false, reason: message };
    }

    console.error("[aiService] live generation failed:", error);
    Sentry.captureException(error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
