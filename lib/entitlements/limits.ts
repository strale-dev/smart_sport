import {
  getFreeTierAiDeepAnalysesPerDay,
  getFreeTierAiGenerationsPerDay,
  getFreeTierAiPredictionsPerDay,
  getFreeTierLiveAiMatchesPerDay,
  getFreeTierLiveAiMinIntervalSec,
  getFreeTierFollowsTotal,
  getFreeTierLiveMatchesSimultaneous,
  getPremiumAiAbuseLimitPerDay,
  getPremiumAiSoftCapPerDay,
} from "@/lib/env";
import type { Database } from "@/types/supabase";

type AppTier = Database["public"]["Enums"]["app_tier"];

export type AiUsageKind =
  | "prediction"
  | "deep_analysis"
  | "generation"
  | "live_match"
  | "live_interval";

export type AiUsageContext = {
  fixtureUuid?: string;
};

export type FreeTierLimits = {
  predictionsPerDay: number;
  deepAnalysesPerDay: number;
  generationsPerDay: number;
  liveAiMatchesPerDay: number;
  liveAiMinIntervalSec: number;
  liveMatchesSimultaneous: number;
  premiumSoftCapPerDay: number | null;
};

export function getFreeTierFollowsTotalLimit(): number {
  return getFreeTierFollowsTotal();
}

export function getFreeTierLimits(): FreeTierLimits {
  return {
    predictionsPerDay: getFreeTierAiPredictionsPerDay(),
    deepAnalysesPerDay: getFreeTierAiDeepAnalysesPerDay(),
    generationsPerDay: getFreeTierAiGenerationsPerDay(),
    liveAiMatchesPerDay: getFreeTierLiveAiMatchesPerDay(),
    liveAiMinIntervalSec: getFreeTierLiveAiMinIntervalSec(),
    liveMatchesSimultaneous: getFreeTierLiveMatchesSimultaneous(),
    premiumSoftCapPerDay: getPremiumAiSoftCapPerDay(),
  };
}

/** Daily generation cap enforced in Redis for tier (premium uses abuse limit, not FREE env). */
export function getDailyGenerationCapForTier(
  tier: AppTier,
  premiumActive: boolean
): number {
  if (tier === "PREMIUM" || premiumActive) {
    return getPremiumAiAbuseLimitPerDay();
  }

  return getFreeTierAiGenerationsPerDay();
}
