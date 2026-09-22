import type {
  LiveInsightResponse,
  PrematchInsightResponse,
} from "@/lib/ai/schemas";
import type { FixturePhase } from "@/lib/ai/status-map";
import { resolveFixturePhase } from "@/lib/ai/status-map";
import type { PrematchInsightHookState } from "@/lib/ai/prematch-insight-state";
import {
  createEmptyPrematchInsightViewModel,
  mapPrematchInsightResponseToViewModel,
  type PrematchInsightViewModel,
} from "@/lib/ai/prematch-insight-state";
import type { PrematchInsightMode, StoredAIInsight } from "@/lib/ai/schemas";
import { resolveLivePhasePrediction } from "@/lib/live/live-insight-display";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";

export const LIVE_UPDATES_HINT =
  "Live commentary updates after key moments and at half-time.";

export function mapLiveInsightResponseToViewModel(
  response: LiveInsightResponse,
  fixtureStatus: string
): {
  state: PrematchInsightHookState;
  insight: StoredAIInsight | null;
  insightMode: PrematchInsightMode | null;
  fixturePhase: FixturePhase;
  errorMessage: string | null;
} {
  const fixturePhase = resolveFixturePhase(fixtureStatus);

  switch (response.status) {
    case "OK":
      return {
        state: "ok",
        insight: response.insight,
        insightMode: response.insightMode,
        fixturePhase,
        errorMessage: null,
      };
    case "MISS":
      return {
        state: "miss",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: null,
      };
    case "UNAVAILABLE":
      return {
        state: "unavailable",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: null,
      };
    case "GUEST_FORBIDDEN":
      return {
        state: "guest",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: null,
      };
    default:
      return {
        state: "error",
        insight: null,
        insightMode: null,
        fixturePhase,
        errorMessage: "Unexpected live insight response",
      };
  }
}

export type LivePhaseQueriesSnapshot = {
  fixtureId: number;
  fixtureStatus: string;
  liveInsightData: LiveInsightResponse | undefined;
  liveInsightError: Error | null;
  liveInsightPending: boolean;
  historicalPrematchData: PrematchInsightResponse | undefined;
  historicalPrematchPending: boolean;
  liveDelta: LiveProbabilityDeltaResponse | undefined;
};

function hasRenderablePartialState(input: LivePhaseQueriesSnapshot): boolean {
  const { liveDelta, historicalPrematchData } = input;
  if (liveDelta?.live != null || liveDelta?.prematchPrediction != null) {
    return true;
  }
  if (historicalPrematchData != null) {
    return true;
  }
  if (input.liveInsightData != null) {
    return true;
  }
  return false;
}

/**
 * Progressive live-phase view model: does not wait for all AI GETs before showing
 * delta, historical prematch, or partial fallbacks.
 */
export function resolveLivePhaseViewModel(
  input: LivePhaseQueriesSnapshot
): PrematchInsightViewModel {
  const {
    fixtureId,
    fixtureStatus,
    liveInsightData,
    liveInsightError,
    liveInsightPending,
    historicalPrematchData,
    historicalPrematchPending,
    liveDelta,
  } = input;

  const liveWinProbabilities = liveDelta?.live ?? null;
  const empty = () => ({
    ...createEmptyPrematchInsightViewModel(fixtureStatus),
    liveWinProbabilities,
  });

  if (liveInsightData?.status === "GUEST_FORBIDDEN") {
    return {
      ...empty(),
      state: "guest",
    };
  }

  if (liveInsightData?.status === "OK") {
    const mapped = mapLiveInsightResponseToViewModel(
      liveInsightData,
      fixtureStatus
    );
    return {
      ...empty(),
      ...mapped,
      prediction: liveInsightData.prediction,
      limit: null,
      used: null,
      fallbackMessage: null,
      liveWinProbabilities,
    };
  }

  if (historicalPrematchData?.status === "OK") {
    const mapped = mapPrematchInsightResponseToViewModel(
      historicalPrematchData,
      fixtureStatus
    );
    return {
      ...mapped,
      prediction: resolveLivePhasePrediction(
        fixtureId,
        liveDelta,
        mapped.prediction
      ),
      fallbackMessage: LIVE_UPDATES_HINT,
      liveWinProbabilities,
    };
  }

  const deltaPrediction = resolveLivePhasePrediction(
    fixtureId,
    liveDelta,
    historicalPrematchData?.status === "MISS"
      ? (historicalPrematchData.prediction ?? null)
      : null
  );

  if (deltaPrediction) {
    return {
      ...empty(),
      state: "fallback",
      insight: null,
      prediction: deltaPrediction,
      insightMode: null,
      limit: null,
      used: null,
      errorMessage: null,
      fallbackMessage: LIVE_UPDATES_HINT,
      liveWinProbabilities,
    };
  }

  const aiReadsPending = liveInsightPending || historicalPrematchPending;
  if (aiReadsPending && !hasRenderablePartialState(input)) {
    return {
      ...empty(),
      state: "loading",
    };
  }

  if (
    liveInsightError &&
    !historicalPrematchPending &&
    historicalPrematchData == null &&
    !deltaPrediction
  ) {
    return {
      ...empty(),
      state: "error",
      errorMessage: liveInsightError.message,
    };
  }

  return {
    ...empty(),
    state: "miss",
  };
}
