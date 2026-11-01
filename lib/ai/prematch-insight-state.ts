import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import type { FixturePhase } from "@/lib/ai/status-map";
import { isFixtureAnalyzable, resolveFixturePhase } from "@/lib/ai/status-map";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
  WinProbabilities,
} from "@/types/prediction";
import type { StoredAIInsight } from "@/lib/ai/schemas";
import type { PrematchInsightMode } from "@/lib/ai/schemas";

export type PrematchInsightHookState =
  | "loading"
  | "ok"
  | "miss"
  | "generating"
  | "unavailable"
  | "fallback"
  | "limit"
  | "error"
  | "guest"
  | "neither";

export type PrematchInsightViewModel = {
  state: PrematchInsightHookState;
  insight: StoredAIInsight | null;
  prediction: PrematchPredictionResult | LivePredictionResult | null;
  insightMode: PrematchInsightMode | null;
  fixturePhase: FixturePhase;
  limit: number | null;
  used: number | null;
  errorMessage: string | null;
  fallbackMessage: string | null;
  /** Latest live model win probabilities when narrative is not ready yet. */
  liveWinProbabilities: WinProbabilities | null;
  /** Shown narrative may be from an older context_hash while refresh runs. */
  contextStale: boolean;
  /** Latest generation attempt failed while showing a (possibly stale) narrative. */
  generationFailureMessage: string | null;
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
        prediction: response.prediction,
        insightMode: response.insightMode,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: response.generationFailure?.message ?? null,
        liveWinProbabilities: null,
        contextStale: response.contextStale === true,
        generationFailureMessage: response.generationFailure?.message ?? null,
      };
    case "MISS":
      return {
        state: response.prediction ? "generating" : "miss",
        insight: null,
        prediction: response.prediction ?? null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: null,
      };
    case "UNAVAILABLE":
      return {
        state: "unavailable",
        insight: null,
        prediction: response.prediction ?? null,
        insightMode: null,
        fixturePhase,
        limit: null,
        used: null,
        errorMessage: null,
        fallbackMessage: null,
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: null,
      };
    case "GENERATION_FAILED":
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
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: response.message,
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
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: response.message,
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
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: null,
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
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: null,
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
        liveWinProbabilities: null,
        contextStale: false,
        generationFailureMessage: null,
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
    liveWinProbabilities: null,
    contextStale: false,
    generationFailureMessage: null,
  };
}
