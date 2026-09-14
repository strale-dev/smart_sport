import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getFreeTierLimits,
  type AiUsageContext,
  type AiUsageKind,
} from "@/lib/entitlements/limits";
import {
  incrementAiUsageCounters,
  readAiUsageRow,
  type AiUsageRow,
} from "@/lib/entitlements/usage";

type AppTier = Database["public"]["Enums"]["app_tier"];
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export class AiLimitReachedError extends Error {
  readonly code = "AI_LIMIT_REACHED" as const;
  readonly limit: number;
  readonly used: number;
  readonly kind: AiUsageKind;

  constructor(kind: AiUsageKind, limit: number, used: number) {
    super(`Daily AI limit reached (${kind})`);
    this.name = "AiLimitReachedError";
    this.kind = kind;
    this.limit = limit;
    this.used = used;
  }
}

export type UserEntitlement = {
  userId: string;
  tier: AppTier;
  subscriptionStatus: SubscriptionStatus | null;
  premiumUntil: string | null;
};

const PREMIUM_ACTIVE_STATUSES: SubscriptionStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
];

export function isPremiumEntitlement(
  tier: AppTier,
  subscriptionStatus: SubscriptionStatus | null
): boolean {
  if (tier === "PREMIUM") {
    return true;
  }

  return subscriptionStatus
    ? PREMIUM_ACTIVE_STATUSES.includes(subscriptionStatus)
    : false;
}

export async function getUserEntitlement(
  userId: string
): Promise<UserEntitlement> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("entitlements")
    .select("tier, premium_until, subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read entitlements: ${error.message}`);
  }

  let status: SubscriptionStatus | null = null;
  if (data?.subscription_id) {
    const { data: subscription, error: subscriptionError } = await client
      .from("subscriptions")
      .select("status")
      .eq("id", data.subscription_id)
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(
        `Failed to read subscription status: ${subscriptionError.message}`
      );
    }

    status = subscription?.status ?? null;
  }

  return {
    userId,
    tier: data?.tier ?? "FREE",
    subscriptionStatus: status,
    premiumUntil: data?.premium_until ?? null,
  };
}

function checkFreeTierLimit(
  kind: AiUsageKind,
  usage: AiUsageRow,
  limits: ReturnType<typeof getFreeTierLimits>,
  ctx?: AiUsageContext
): void {
  if (
    kind === "generation" ||
    kind === "prediction" ||
    kind === "deep_analysis"
  ) {
    if (usage.ai_generations_count >= limits.generationsPerDay) {
      throw new AiLimitReachedError(
        "generation",
        limits.generationsPerDay,
        usage.ai_generations_count
      );
    }
  }

  if (kind === "prediction") {
    if (usage.ai_predictions_count >= limits.predictionsPerDay) {
      throw new AiLimitReachedError(
        "prediction",
        limits.predictionsPerDay,
        usage.ai_predictions_count
      );
    }
  }

  if (kind === "deep_analysis") {
    if (usage.ai_deep_analyses_count >= limits.deepAnalysesPerDay) {
      throw new AiLimitReachedError(
        "deep_analysis",
        limits.deepAnalysesPerDay,
        usage.ai_deep_analyses_count
      );
    }
  }

  if (kind === "live_match" && ctx?.fixtureUuid) {
    const alreadyTracked = usage.live_ai_matches.includes(ctx.fixtureUuid);
    if (
      !alreadyTracked &&
      usage.live_ai_matches.length >= limits.liveAiMatchesPerDay
    ) {
      throw new AiLimitReachedError(
        "live_match",
        limits.liveAiMatchesPerDay,
        usage.live_ai_matches.length
      );
    }
  }

  if (kind === "live_interval" && ctx?.fixtureUuid) {
    const lastAt = usage.last_live_ai_at[ctx.fixtureUuid];
    if (lastAt) {
      const elapsedMs = Date.now() - new Date(lastAt).getTime();
      const minMs = limits.liveAiMinIntervalSec * 1000;
      if (elapsedMs < minMs) {
        throw new AiLimitReachedError(
          "live_interval",
          limits.liveAiMinIntervalSec,
          Math.floor(elapsedMs / 1000)
        );
      }
    }
  }
}

function checkPremiumSoftCap(
  usage: AiUsageRow,
  limits: ReturnType<typeof getFreeTierLimits>
): void {
  const cap = limits.premiumSoftCapPerDay;
  if (cap === null) {
    return;
  }

  if (usage.ai_generations_count >= cap) {
    throw new AiLimitReachedError(
      "generation",
      cap,
      usage.ai_generations_count
    );
  }
}

export async function canGenerateAI(
  userId: string,
  kind: AiUsageKind,
  ctx?: AiUsageContext
): Promise<void> {
  const entitlement = await getUserEntitlement(userId);
  const usage = await readAiUsageRow(userId);
  const limits = getFreeTierLimits();

  const premium = isPremiumEntitlement(
    entitlement.tier,
    entitlement.subscriptionStatus
  );

  if (premium) {
    checkPremiumSoftCap(usage, limits);
    return;
  }

  checkFreeTierLimit(kind, usage, limits, ctx);
}

export async function assertCanGenerateAI(
  userId: string,
  kind: AiUsageKind,
  ctx?: AiUsageContext
): Promise<void> {
  try {
    await canGenerateAI(userId, kind, ctx);
  } catch (error) {
    if (error instanceof AiLimitReachedError) {
      Sentry.addBreadcrumb({
        category: "entitlements",
        message: "AI generation denied",
        level: "info",
        data: {
          userId,
          kind,
          limit: error.limit,
          used: error.used,
        },
      });
    }
    throw error;
  }
}

export async function recordAIUsage(
  userId: string,
  kind: AiUsageKind,
  ctx?: AiUsageContext
): Promise<AiUsageRow> {
  const increment = {
    predictions: kind === "prediction" ? 1 : 0,
    deepAnalyses: kind === "deep_analysis" ? 1 : 0,
    generations:
      kind === "prediction" ||
      kind === "deep_analysis" ||
      kind === "generation" ||
      kind === "live_match"
        ? 1
        : 0,
    liveFixtureUuid:
      kind === "live_match" || kind === "live_interval"
        ? ctx?.fixtureUuid
        : undefined,
  };

  return incrementAiUsageCounters(userId, increment);
}

export async function getAiUsageSummary(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const limits = getFreeTierLimits();
  const entitlement = await getUserEntitlement(userId);
  const usage = await readAiUsageRow(userId);

  if (isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus)) {
    const cap = limits.premiumSoftCapPerDay ?? limits.generationsPerDay;
    const used = usage.ai_generations_count;
    return {
      limit: cap,
      used,
      remaining: Math.max(0, cap - used),
    };
  }

  const limit = limits.predictionsPerDay;
  const used = usage.ai_predictions_count;
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}
