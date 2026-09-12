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
  generateStructuredInsight,
  OpenAiGenerationError,
  OpenAiNotConfiguredError,
} from "@/lib/ai/openai";
import {
  buildPrematchSystemPrompt,
  buildLiveSystemPrompt,
} from "@/lib/ai/prompts";
import type {
  LiveInsightResponse,
  PrematchInsightResponse,
} from "@/lib/ai/schemas";
import {
  canGeneratePrematchInsight,
  resolveFixturePhase,
} from "@/lib/ai/status-map";
import {
  AiLimitReachedError,
  assertCanGenerateAi,
  getAiDailyLimit,
  getAiUsageStatus,
  recordAiGeneration,
} from "@/lib/ai/usage-gate";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import type { MeaningfulEventKind } from "@/lib/live/event-detector-types";
import type { LivePredictionResult } from "@/types/prediction";
import {
  buildLiveContext,
  buildLiveUserPrompt,
  buildPrematchContext,
  buildPrematchUserPrompt,
} from "@/lib/services/aiContextService";
import { getOrComputePrematch } from "@/lib/services/predictionService";

export type GeneratePrematchInsightOptions = {
  userId?: string | null;
  trigger: "user" | "cron";
};

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
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "NO_STORED_INSIGHT",
    };
  }

  return {
    status: "OK",
    insight: mapAiInsightRowToStored(row, fixtureExternalId, true),
    cached: true,
    insightMode: "historical",
  };
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

  return {
    status: "OK",
    insight: stored,
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
    return { status: "MISS", fixtureExternalId };
  }

  return {
    status: "OK",
    insight: stored,
    cached: true,
    insightMode: "prematch",
  };
}

export async function generatePrematchInsight(
  fixtureExternalId: number,
  options: GeneratePrematchInsightOptions
): Promise<PrematchInsightResponse> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return { status: "MISS", fixtureExternalId };
  }

  if (!canGeneratePrematchInsight(fixture.status)) {
    return {
      status: "UNAVAILABLE",
      fixtureExternalId,
      reason: "NO_STORED_INSIGHT",
    };
  }

  const prediction = await getOrComputePrematch(fixtureExternalId);
  if (!prediction) {
    return { status: "MISS", fixtureExternalId };
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
      cached: true,
      insightMode: "prematch",
    };
  }

  if (options.trigger === "user") {
    if (!options.userId) {
      return { status: "GUEST_FORBIDDEN" };
    }

    try {
      await assertCanGenerateAi(options.userId);
    } catch (error) {
      if (error instanceof AiLimitReachedError) {
        return {
          status: "AI_LIMIT_REACHED",
          limit: error.limit,
          used: error.used,
        };
      }
      throw error;
    }
  }

  try {
    const generated = await withPrematchInsightLock(
      fixtureExternalId,
      async () => {
        const cachedInsideLock = await readPrematchInsightFromStore(
          fixture.id,
          fixtureExternalId,
          contextHash
        );
        if (cachedInsideLock) {
          return cachedInsideLock;
        }

        const llm = await generateStructuredInsight({
          systemPrompt: buildPrematchSystemPrompt(),
          userPrompt: buildPrematchUserPrompt(context),
        });

        const row = await insertAiInsight({
          fixtureUuid: fixture.id,
          predictionId: prediction.predictionId,
          contextHash,
          openaiModel: llm.model,
          promptVersion: context.promptVersion,
          payload: llm.parsed,
          rawOutput: llm.rawOutput as Json,
          tokensInput: llm.tokensInput,
          tokensOutput: llm.tokensOutput,
          costUsd: llm.costUsd,
        });

        const stored = mapAiInsightRowToStored(row, fixtureExternalId, false);
        await writePrematchInsightCache(fixtureExternalId, contextHash, stored);
        return stored;
      }
    );

    if (options.trigger === "user" && options.userId) {
      await recordAiGeneration(options.userId);
    }

    return {
      status: "OK",
      insight: generated,
      cached: false,
      insightMode: "prematch",
    };
  } catch (error) {
    if (error instanceof AiLimitReachedError) {
      return {
        status: "AI_LIMIT_REACHED",
        limit: error.limit,
        used: error.used,
      };
    }

    if (
      error instanceof OpenAiNotConfiguredError ||
      error instanceof OpenAiGenerationError
    ) {
      const message =
        error instanceof OpenAiNotConfiguredError
          ? error.message
          : error.message;

      console.error("[aiService] prematch generation failed:", message);
      return buildFallbackResponse(fixtureExternalId, prediction, message);
    }

    console.error("[aiService] prematch generation failed:", error);
    if (error instanceof Error) {
      return buildFallbackResponse(
        fixtureExternalId,
        prediction,
        error.message
      );
    }

    throw error;
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
  liveStats: {
    xgHome: number | null;
    xgAway: number | null;
    redCardsHome: number;
    redCardsAway: number;
  };
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

      const llm = await generateStructuredInsight({
        systemPrompt: buildLiveSystemPrompt(),
        userPrompt: buildLiveUserPrompt(context),
      });

      const row = await insertAiInsight({
        fixtureUuid: fixture.id,
        predictionId: input.prediction.predictionId,
        contextHash,
        openaiModel: llm.model,
        promptVersion: context.promptVersion,
        payload: llm.parsed,
        rawOutput: llm.rawOutput as Json,
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

    return { ok: true, contextHash, cached: false };
  } catch (error) {
    if (
      error instanceof OpenAiNotConfiguredError ||
      error instanceof OpenAiGenerationError
    ) {
      const message =
        error instanceof OpenAiNotConfiguredError
          ? error.message
          : error.message;
      console.error("[aiService] live generation failed:", message);
      return { ok: false, reason: message };
    }

    console.error("[aiService] live generation failed:", error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
