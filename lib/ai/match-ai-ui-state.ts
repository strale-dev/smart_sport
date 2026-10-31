import type {
  AiInsightReasonCode,
  CanonicalInsightState,
  ResolvedCanonicalPrematchState,
} from "@/lib/ai/canonical-insight-state";
import type { PrematchInsightHookState } from "@/lib/ai/prematch-insight-state";
import type { FixturePhase } from "@/lib/ai/status-map";
import type { LiveInsightResponse } from "@/lib/ai/schemas";
import type { LivePredictionUnavailableReason } from "@/lib/predictions/live-prediction-validation";

export type MatchAiUiState =
  | "AI_READY"
  | "AI_LOADING"
  | "AI_NOT_READY"
  | "AI_UNAVAILABLE"
  | "AI_FAILED"
  | "NO_DATA";

export type MatchAiUiCopy = {
  title: string;
  description: string;
  showSkeleton: boolean;
  showRetry: boolean;
};

export type ResolveMatchAiUiStateInput = {
  fixturePhase: FixturePhase;
  hookState: PrematchInsightHookState;
  isGuest: boolean;
  isGenerating: boolean;
  hasInsight: boolean;
  hasPrediction: boolean;
  hasLiveWinProbabilities: boolean;
  canonical: ResolvedCanonicalPrematchState | null;
  liveInsightStatus: LiveInsightResponse["status"] | null;
  liveAvailable: boolean | null;
  liveUnavailableReason: LivePredictionUnavailableReason | null;
  networkErrorMessage: string | null;
  dailyLimitReached: boolean;
};

function liveReasonToCopy(reason: LivePredictionUnavailableReason): {
  title: string;
  description: string;
} {
  switch (reason) {
    case "NO_LIVE_PREDICTION":
      return {
        title: "No in-match update yet",
        description:
          "The in-match model has not produced an update for this scoreline yet.",
      };
    case "SCORE_MISMATCH":
      return {
        title: "Live probabilities paused",
        description:
          "Live win probabilities are paused until they match the score on the pitch.",
      };
    case "MINUTE_BEHIND":
      return {
        title: "Live probabilities catching up",
        description:
          "Live win probabilities are catching up to the current minute.",
      };
    case "STATUS_MISMATCH":
      return {
        title: "Live probabilities paused",
        description:
          "Live win probabilities are paused while we reconcile match status.",
      };
    case "SCORE_UNAVAILABLE":
      return {
        title: "Waiting for a confirmed score",
        description:
          "Live win probabilities need a confirmed score before they can update.",
      };
    case "FIXTURE_ID_MISMATCH":
      return {
        title: "Live model could not be matched",
        description: "Live model data could not be matched to this fixture.",
      };
    case "LIVE_POLLING_DISABLED":
      return {
        title: "Live updates paused",
        description:
          "Live updates are temporarily disabled; pre-kickoff numbers may still appear below.",
      };
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function formatLivePredictionUnavailableReason(
  reason: LivePredictionUnavailableReason | null | undefined
): string {
  if (reason == null) {
    return "Live win probabilities are not available for this moment in the match.";
  }

  return liveReasonToCopy(reason).description;
}

export function inferMatchAiReasonCode(input: {
  canonicalReason: AiInsightReasonCode | null | undefined;
  isGuest: boolean;
  hookState: PrematchInsightHookState;
  fixturePhase: FixturePhase;
  hasInsight: boolean;
}): AiInsightReasonCode | null {
  if (input.canonicalReason) {
    return input.canonicalReason;
  }

  if (input.isGuest || input.hookState === "guest") {
    return "GUEST_FORBIDDEN";
  }

  if (input.hookState === "limit") {
    return "DAILY_LIMIT";
  }

  if (input.hookState === "neither") {
    return "FIXTURE_NOT_ANALYZABLE";
  }

  if (input.hookState === "error") {
    return "NETWORK_ERROR";
  }

  if (
    !input.hasInsight &&
    (input.fixturePhase === "LIVE" || input.fixturePhase === "FINISHED")
  ) {
    return "NO_STORED_INSIGHT";
  }

  return null;
}

function mapCanonicalToMatchAiUiState(
  canonical: ResolvedCanonicalPrematchState,
  input: Pick<
    ResolveMatchAiUiStateInput,
    "hasInsight" | "hasPrediction" | "isGenerating"
  >
): MatchAiUiState {
  if (canonical.canonicalState === "AVAILABLE") {
    return input.hasInsight ? "AI_READY" : "NO_DATA";
  }

  if (canonical.canonicalState === "GENERATION_PENDING") {
    return "AI_LOADING";
  }

  if (canonical.canonicalState === "GENERATION_FAILED") {
    return input.hasInsight ? "AI_READY" : "AI_FAILED";
  }

  if (canonical.canonicalState === "UNAVAILABLE") {
    if (canonical.reasonCode === "NO_STORED_INSIGHT" && !input.hasPrediction) {
      return "NO_DATA";
    }
    return "AI_UNAVAILABLE";
  }

  if (canonical.canonicalState === "NOT_READY") {
    if (canonical.reasonCode === "LOADING" || input.isGenerating) {
      return "AI_LOADING";
    }
    if (
      canonical.reasonCode === "AI_CONTEXT_NOT_READY" ||
      canonical.reasonCode === "READINESS_NOT_MET"
    ) {
      return input.hasPrediction ? "AI_LOADING" : "AI_NOT_READY";
    }
    return input.hasPrediction ? "AI_LOADING" : "AI_NOT_READY";
  }

  return "AI_LOADING";
}

function resolveLivePhaseMatchAiUiState(
  input: ResolveMatchAiUiStateInput
): MatchAiUiState {
  if (input.hookState === "guest") {
    return input.hasPrediction || input.hasLiveWinProbabilities
      ? "AI_UNAVAILABLE"
      : "NO_DATA";
  }

  if (input.hookState === "neither") {
    return "AI_UNAVAILABLE";
  }

  if (input.hasInsight && input.hookState === "ok") {
    return "AI_READY";
  }

  if (input.hookState === "error" && input.networkErrorMessage) {
    if (input.hasPrediction || input.hasLiveWinProbabilities) {
      return input.hasInsight ? "AI_READY" : "AI_LOADING";
    }
    return "AI_FAILED";
  }

  if (input.hookState === "limit" || input.dailyLimitReached) {
    return "AI_UNAVAILABLE";
  }

  if (input.hookState === "unavailable") {
    return "AI_UNAVAILABLE";
  }

  if (input.hookState === "fallback" && !input.hasInsight) {
    if (input.hasPrediction || input.hasLiveWinProbabilities) {
      return "AI_LOADING";
    }
    return "AI_FAILED";
  }

  if (input.hookState === "loading" || input.hookState === "generating") {
    if (
      input.hasPrediction ||
      input.hasLiveWinProbabilities ||
      input.hasInsight
    ) {
      return input.hasInsight ? "AI_READY" : "AI_LOADING";
    }
    return "AI_LOADING";
  }

  if (input.hookState === "miss") {
    if (input.hasPrediction || input.hasLiveWinProbabilities) {
      return "AI_LOADING";
    }
    if (input.liveAvailable === false && !input.hasPrediction) {
      return "NO_DATA";
    }
    return "NO_DATA";
  }

  if (input.hasInsight) {
    return "AI_READY";
  }

  if (input.hasPrediction || input.hasLiveWinProbabilities) {
    return "AI_LOADING";
  }

  return "NO_DATA";
}

export function resolveMatchAiUiState(
  input: ResolveMatchAiUiStateInput
): MatchAiUiState {
  if (input.hookState === "guest") {
    return input.hasPrediction || input.hasLiveWinProbabilities
      ? "AI_UNAVAILABLE"
      : "NO_DATA";
  }

  if (input.hookState === "neither") {
    return "AI_UNAVAILABLE";
  }

  if (input.fixturePhase === "LIVE") {
    return resolveLivePhaseMatchAiUiState(input);
  }

  if (input.canonical) {
    return mapCanonicalToMatchAiUiState(input.canonical, input);
  }

  if (input.hookState === "loading") {
    return "AI_LOADING";
  }

  if (input.hookState === "error") {
    return input.hasInsight ? "AI_READY" : "AI_FAILED";
  }

  if (input.hookState === "limit" || input.dailyLimitReached) {
    return "AI_UNAVAILABLE";
  }

  if (input.hookState === "ok" && input.hasInsight) {
    return "AI_READY";
  }

  if (input.hookState === "generating" || input.isGenerating) {
    return "AI_LOADING";
  }

  if (input.hookState === "fallback") {
    return input.hasInsight ? "AI_READY" : "AI_FAILED";
  }

  if (input.hookState === "unavailable") {
    return input.hasPrediction ? "AI_UNAVAILABLE" : "NO_DATA";
  }

  if (input.hookState === "miss") {
    return input.hasPrediction ? "AI_LOADING" : "NO_DATA";
  }

  return "AI_LOADING";
}

function reasonToUnavailableCopy(
  code: AiInsightReasonCode,
  fixturePhase: FixturePhase
): {
  title: string;
  description: string;
} {
  switch (code) {
    case "GUEST_FORBIDDEN":
      return {
        title: "Sign in for AI analysis",
        description:
          "Create a free account to unlock pre-match and live analyst commentary for this fixture.",
      };
    case "DAILY_LIMIT":
      return {
        title: "Daily AI limit reached",
        description:
          "You have used your personal AI generation quota for today. Stored shared analysis still appears when available.",
      };
    case "FIXTURE_NOT_ANALYZABLE":
      return {
        title: "Analysis not available",
        description:
          "This fixture was postponed, cancelled, or otherwise removed from analysis.",
      };
    case "AI_CONTEXT_NOT_READY":
      return {
        title: "Still preparing match context",
        description:
          "We are still collecting teams, form, and lineups needed before AI analysis can run.",
      };
    case "READINESS_NOT_MET":
      return {
        title: "Not enough data yet",
        description:
          "Prediction and AI need more reliable inputs for this fixture. Check back closer to kickoff.",
      };
    case "NO_STORED_INSIGHT":
      return {
        title: "No stored analysis",
        description:
          fixturePhase === "FINISHED"
            ? "This match finished without a saved AI narrative. We do not generate a new write-up after full time."
            : fixturePhase === "LIVE"
              ? "No pre-match AI narrative was stored before kickoff. Live commentary cannot start from a saved baseline."
              : "We do not have a saved AI narrative for this fixture. Model probabilities may still appear when ready.",
      };
    case "GENERATION_NOT_ALLOWED":
      return {
        title: "Analysis not offered",
        description:
          "This fixture is outside the 36-hour window where we generate AI commentary.",
      };
    case "LOADING":
      return {
        title: "Loading AI analysis",
        description: "Fetching prediction and AI commentary for this fixture.",
      };
    case "STALE_CONTEXT_HASH":
      return {
        title: "Refreshing match analysis",
        description:
          "Match data changed. We are refreshing the saved analysis to match the latest context.",
      };
    case "OPENAI_NOT_CONFIGURED":
      return {
        title: "AI analysis unavailable",
        description:
          "The analysis service is not configured for this environment, so no narrative can be generated.",
      };
    case "OPENAI_TIMEOUT":
      return {
        title: "Analysis timed out",
        description:
          "The AI request timed out before a narrative was ready. Model probabilities may still appear when available.",
      };
    case "OPENAI_PROVIDER_ERROR":
      return {
        title: "Analysis service error",
        description:
          "The AI provider could not generate commentary for this fixture. Model probabilities may still appear when available.",
      };
    case "MALFORMED_OUTPUT":
      return {
        title: "Analysis could not be shown",
        description:
          "The generated commentary was incomplete or invalid, so we are not showing it for this fixture.",
      };
    case "RATE_LIMIT":
      return {
        title: "AI temporarily rate limited",
        description:
          "Too many analysis requests are in flight. Try again shortly; stored analysis still appears when available.",
      };
    case "GENERATION_CONCURRENT":
      return {
        title: "Analysis already running",
        description:
          "Another generation is already in progress for this fixture. The shared analysis will appear here when it finishes.",
      };
    case "NETWORK_ERROR":
      return {
        title: "Could not load AI analysis",
        description:
          "A network error interrupted the analysis request. Retry when your connection is stable.",
      };
    case "UNKNOWN":
      return {
        title: "Pre-match analysis unavailable",
        description: "We cannot show AI commentary for this fixture right now.",
      };
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

function resolveUnavailableCopy(input: {
  fixturePhase: FixturePhase;
  reasonCode?: AiInsightReasonCode | null;
  liveUnavailableReason?: LivePredictionUnavailableReason | null;
}): {
  title: string;
  description: string;
} {
  if (input.liveUnavailableReason != null) {
    return liveReasonToCopy(input.liveUnavailableReason);
  }

  if (input.reasonCode) {
    return reasonToUnavailableCopy(input.reasonCode, input.fixturePhase);
  }

  if (input.fixturePhase === "LIVE" || input.fixturePhase === "FINISHED") {
    return reasonToUnavailableCopy("NO_STORED_INSIGHT", input.fixturePhase);
  }

  if (input.fixturePhase === "NEITHER") {
    return reasonToUnavailableCopy(
      "FIXTURE_NOT_ANALYZABLE",
      input.fixturePhase
    );
  }

  return {
    title: "Analysis unavailable",
    description: "AI commentary is not available for this fixture.",
  };
}

export function describeMatchAiUiState(input: {
  state: MatchAiUiState;
  fixturePhase: FixturePhase;
  reasonCode?: AiInsightReasonCode | null;
  liveUnavailableReason?: LivePredictionUnavailableReason | null;
  hasPrediction?: boolean;
  hasLiveWinProbabilities?: boolean;
  generationFailureMessage?: string | null;
  contextStale?: boolean;
  networkErrorMessage?: string | null;
}): MatchAiUiCopy {
  const {
    state,
    fixturePhase,
    reasonCode,
    liveUnavailableReason,
    hasPrediction,
    generationFailureMessage,
    contextStale,
    networkErrorMessage,
  } = input;

  switch (state) {
    case "AI_READY":
      return {
        title: "AI match analysis",
        description:
          generationFailureMessage ??
          (contextStale
            ? "Showing the last saved analysis while we refresh for the latest match data."
            : "Shared pre-match analysis for this fixture."),
        showSkeleton: false,
        showRetry: Boolean(generationFailureMessage),
      };
    case "AI_LOADING":
      return {
        title: hasPrediction ? "Preparing analysis" : "Loading AI analysis",
        description: hasPrediction
          ? fixturePhase === "LIVE"
            ? "Live commentary updates after key moments. Model numbers are already available below."
            : "Building the shared pre-match analysis. Model probabilities are already available below."
          : "Fetching prediction and AI commentary for this fixture.",
        showSkeleton: !hasPrediction,
        showRetry: false,
      };
    case "AI_NOT_READY": {
      const notReady = reasonCode
        ? reasonToUnavailableCopy(reasonCode, fixturePhase)
        : {
            title: "Analysis not ready yet",
            description:
              "We are still gathering the data required before AI can analyze this match.",
          };
      return {
        ...notReady,
        showSkeleton: false,
        showRetry: false,
      };
    }
    case "AI_UNAVAILABLE": {
      const unavailable = resolveUnavailableCopy({
        fixturePhase,
        reasonCode,
        liveUnavailableReason,
      });
      return {
        ...unavailable,
        showSkeleton: false,
        showRetry: false,
      };
    }
    case "AI_FAILED": {
      const failedReason =
        !networkErrorMessage && reasonCode
          ? reasonToUnavailableCopy(reasonCode, fixturePhase)
          : null;
      return {
        title: failedReason?.title ?? "Could not load AI analysis",
        description:
          networkErrorMessage ??
          failedReason?.description ??
          "The narrative analysis failed to generate. Model probabilities may still be shown when available.",
        showSkeleton: false,
        showRetry: fixturePhase !== "LIVE",
      };
    }
    case "NO_DATA": {
      const noData = resolveUnavailableCopy({
        fixturePhase,
        reasonCode,
        liveUnavailableReason,
      });
      return {
        ...noData,
        showSkeleton: false,
        showRetry: false,
      };
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function mapCanonicalStateForExport(
  canonicalState: CanonicalInsightState
): MatchAiUiState {
  switch (canonicalState) {
    case "AVAILABLE":
      return "AI_READY";
    case "GENERATION_PENDING":
      return "AI_LOADING";
    case "GENERATION_FAILED":
      return "AI_FAILED";
    case "UNAVAILABLE":
      return "AI_UNAVAILABLE";
    case "NOT_READY":
      return "AI_NOT_READY";
    default: {
      const _exhaustive: never = canonicalState;
      return _exhaustive;
    }
  }
}
