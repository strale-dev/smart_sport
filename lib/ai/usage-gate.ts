import {
  assertCanGenerateAI,
  getAiUsageSummary,
  getUserEntitlement,
  isPremiumEntitlement,
  recordAIUsage,
} from "@/lib/entitlements/entitlementService";
import type { AiUsageContext, AiUsageKind } from "@/lib/entitlements/limits";
import { getFreeTierAiPredictionsPerDay } from "@/lib/env";

export { AiLimitReachedError } from "@/lib/entitlements/entitlementService";
export type { AiUsageKind } from "@/lib/entitlements/limits";

/** @deprecated Production paths use Postgres + Redis mirror; kept for API compatibility. */
export class AiRateLimitUnavailableError extends Error {
  readonly code = "RATE_LIMIT_UNAVAILABLE" as const;

  constructor() {
    super("AI rate limiting is unavailable");
    this.name = "AiRateLimitUnavailableError";
  }
}

export function getAiDailyLimit(): number {
  return getFreeTierAiPredictionsPerDay();
}

export async function getAiUsageStatus(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  return getAiUsageSummary(userId);
}

export async function assertCanGenerateAi(
  userId: string,
  kind: AiUsageKind = "prediction",
  ctx?: AiUsageContext
): Promise<void> {
  await assertCanGenerateAI(userId, kind, ctx);
}

export async function recordAiGeneration(
  userId: string,
  kind: AiUsageKind = "prediction",
  ctx?: AiUsageContext
): Promise<number> {
  const entitlement = await getUserEntitlement(userId);
  const premium = isPremiumEntitlement(
    entitlement.tier,
    entitlement.subscriptionStatus
  );

  const row = await recordAIUsage(userId, kind, ctx);

  if (premium) {
    return row.ai_generations_count;
  }

  return kind === "prediction"
    ? row.ai_predictions_count
    : row.ai_generations_count;
}
