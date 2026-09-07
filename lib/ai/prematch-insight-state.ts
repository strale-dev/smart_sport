import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import type { FixturePhase } from "@/lib/ai/status-map";
import { isFixtureAnalyzable, resolveFixturePhase } from "@/lib/ai/status-map";
import type { PrematchPredictionResult } from "@/types/prediction";
import type { StoredAIInsight } from "@/lib/ai/schemas";
import type { PrematchInsightMode } from "@/lib/ai/schemas";

export type PrematchInsightHookState =
  | "loading"
  | "ok"
  | "miss"
  | "unavailable"
  | "fallback"
  | "limit"
  | "error"
  | "guest"
  | "neither";

export type PrematchInsightViewModel = {
  state: PrematchInsightHookState;
  insight: StoredAIInsight | null;
  prediction: PrematchPredictionResult | null;
  insightMode: PrematchInsightMode | null;
  fixturePhase: FixturePhase;
  limit: number | null;
  used: number | null;
  errorMessage: string | null;
  fallbackMessage: string | null;
};

export function resolveInitialPrematchInsightState(input: {
  isGuest: boolean;
  fixtureStatus: string;
}): PrematchInsightHookState {
  if (input.isGuest) {
    return "guest";
  }

  if (!isFixtureAnalyzable(input.fixtureStatus)) {
    return "neither";
  }

  return "loading";
}

export function mapPrematchInsightResponseToViewModel(
  response: PrematchInsightResponse,
  fixtureStatus: string
): PrematchInsightViewModel {
  const fixturePhase = resolveFixturePhase(fixtureStatus);

  switch (response.status) {
    case "OK":
      return {
        state: "ok",
        insight: response.insight,
        prediction: null,
        insightMode: response.insightMode,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
      };
    case "MISS":
      return {
        state: "miss",
        insight: null,
        prediction: null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
      };
    case "UNAVAILABLE":
      return {
        state: "unavailable",
        insight: null,
        prediction: null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
      };
    case "FALLBACK":
      return {
        state: "fallback",
        insight: null,
        prediction: response.prediction,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: response.message,
      };
    case "AI_LIMIT_REACHED":
      return {
        state: "limit",
        insight: null,
        prediction: null,
        insightMode: null,
        fixturePhase,
        limit: response.limit,
        used: response.used,
        errorMessage: null,
        fallbackMessage: null,
      };
    case "GUEST_FORBIDDEN":
      return {
        state: "guest",
        insight: null,
        prediction: null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
      };
    default:
      return {
        state: "error",
        insight: null,
        prediction: null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: "Unexpected response",
        fallbackMessage: null,
      };
  }
}

export function createEmptyPrematchInsightViewModel(
  fixtureStatus: string
): PrematchInsightViewModel {
  return {
    state: "loading",
    insight: null,
    prediction: null,
    insightMode: null,
    fixturePhase: resolveFixturePhase(fixtureStatus),
    limit: null,
    used: null,
    errorMessage: null,
    fallbackMessage: null,
  };
}
