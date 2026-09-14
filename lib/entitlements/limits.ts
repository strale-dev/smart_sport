import {
  getFreeTierAiDeepAnalysesPerDay,
  getFreeTierAiGenerationsPerDay,
  getFreeTierAiPredictionsPerDay,
  getFreeTierLiveAiMatchesPerDay,
  getFreeTierLiveAiMinIntervalSec,
  getFreeTierLiveMatchesSimultaneous,
  getPremiumAiSoftCapPerDay,
} from "@/lib/env";

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
