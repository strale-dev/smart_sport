import {
  mapAiInsightRowToStored,
  readPrematchInsightFromStore,
  withPrematchInsightLock,
  writePrematchInsightCache,
} from "@/lib/ai/cache";
import { insertAiInsight } from "@/lib/ai/db";
import type { Json } from "@/types/supabase";
import {
  generateStructuredInsight,
  OpenAiGenerationError,
  OpenAiNotConfiguredError,
} from "@/lib/ai/openai";
import { buildPrematchSystemPrompt } from "@/lib/ai/prompts";
import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import {
  AiLimitReachedError,
  assertCanGenerateAi,
  getAiDailyLimit,
  getAiUsageStatus,
  recordAiGeneration,
} from "@/lib/ai/usage-gate";
import { resolveFixtureUuidByExternalId } from "@/lib/predictions/db";
import {
  buildPrematchContext,
  buildPrematchUserPrompt,
} from "@/lib/services/aiContextService";
import { getOrComputePrematch } from "@/lib/services/predictionService";

const PREMATCH_STATUSES = new Set(["NS", "TBD"]);

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

export async function readPrematchInsight(
  fixtureExternalId: number
): Promise<PrematchInsightResponse> {
  const fixture = await resolveFixtureUuidByExternalId(fixtureExternalId);
  if (!fixture) {
    return { status: "MISS", fixtureExternalId };
  }

  if (!PREMATCH_STATUSES.has(fixture.status)) {
    return {
      status: "NOT_PREMATCH",
      fixtureExternalId,
      fixtureStatus: fixture.status,
    };
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

  if (!PREMATCH_STATUSES.has(fixture.status)) {
    return {
      status: "NOT_PREMATCH",
      fixtureExternalId,
      fixtureStatus: fixture.status,
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
