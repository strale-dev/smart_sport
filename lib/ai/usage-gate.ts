import * as Sentry from "@sentry/nextjs";

import {
  AiLimitReachedError,
  assertCanGenerateAI,
  getAiUsageSummary,
  recordAIUsage,
} from "@/lib/entitlements/entitlementService";
import type { AiUsageContext, AiUsageKind } from "@/lib/entitlements/limits";
import { getFreeTierAiPredictionsPerDay } from "@/lib/env";
import { env } from "@/lib/env.server";
import {
  AiRateLimitUnavailableError,
  consumeAiGeneration,
  getAiRateLimitStatus,
  isAiRateLimitAvailable,
} from "@/lib/ratelimit/ai";

export { AiLimitReachedError } from "@/lib/entitlements/entitlementService";
export { AiRateLimitUnavailableError } from "@/lib/ratelimit/ai";
export type { AiUsageKind } from "@/lib/entitlements/limits";

function isProduction(): boolean {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

export function getAiDailyLimit(): number {
  return getFreeTierAiPredictionsPerDay();
}

export async function getAiUsageStatus(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  if (isAiRateLimitAvailable()) {
    const status = await getAiRateLimitStatus(userId);
    if (status) {
      return status;
    }
  }

  if (!isProduction()) {
    return getAiUsageSummary(userId);
  }

  return getAiUsageSummary(userId);
}

export async function assertCanGenerateAi(
  userId: string,
  kind: AiUsageKind = "prediction",
  ctx?: AiUsageContext
): Promise<void> {
  await assertCanGenerateAI(userId, kind, ctx);

  if (isAiRateLimitAvailable()) {
    const status = await getAiRateLimitStatus(userId);
    if (!status) {
      if (isProduction()) {
        throw new AiRateLimitUnavailableError();
      }
      return;
    }

    if (status.remaining <= 0) {
      throw new AiLimitReachedError("prediction", status.limit, status.used);
    }
  }
}

export async function recordAiGeneration(
  userId: string,
  kind: AiUsageKind = "prediction",
  ctx?: AiUsageContext
): Promise<number> {
  const row = await recordAIUsage(userId, kind, ctx);

  if (isAiRateLimitAvailable()) {
    try {
      await consumeAiGeneration(userId);
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        "[usage-gate] Redis consume failed after successful generation:",
        error
      );
    }
  }

  return row.ai_predictions_count;
}
