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
  description: string | null;
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

export function formatLivePredictionUnavailableReason(
  reason: LivePredictionUnavailableReason | null | undefined
): string {
  switch (reason) {
    case "NO_LIVE_PREDICTION":
      return "The in-match model has not produced an update for this scoreline yet.";
    case "SCORE_MISMATCH":
      return "Live win probabilities are paused until they match the score on the pitch.";
    case "MINUTE_BEHIND":
      return "Live win probabilities are catching up to the current minute.";
    case "STATUS_MISMATCH":
      return "Live win probabilities are paused while we reconcile match status.";
    case "SCORE_UNAVAILABLE":
      return "Live win probabilities need a confirmed score before they can update.";
    case "FIXTURE_ID_MISMATCH":
      return "Live model data could not be matched to this fixture.";
    case "LIVE_POLLING_DISABLED":
      return "Live updates are temporarily disabled; pre-kickoff numbers may still appear below.";
    default:
      return "Live win probabilities are not available for this moment in the match.";
  }
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

function reasonToUnavailableCopy(code: AiInsightReasonCode): {
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
          "We do not have a saved AI narrative for this fixture. Model probabilities may still appear when ready.",
      };
    case "GENERATION_NOT_ALLOWED":
      return {
        title: "Analysis not offered",
        description:
          "This fixture is outside the window or policy where we generate AI commentary.",
      };
    default:
      return {
        title: "Pre-match analysis unavailable",
        description: "We cannot show AI commentary for this fixture right now.",
      };
  }
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
            : null),
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
    case "AI_NOT_READY":
      return {
        title: "Analysis not ready yet",
        description:
          reasonCode === "READINESS_NOT_MET"
            ? reasonToUnavailableCopy("READINESS_NOT_MET").description
            : "We are still gathering the data required before AI can analyze this match.",
        showSkeleton: false,
        showRetry: false,
      };
    case "AI_UNAVAILABLE": {
      const fromReason = reasonCode
        ? reasonToUnavailableCopy(reasonCode)
        : null;
      const liveLine =
        liveUnavailableReason != null
          ? formatLivePredictionUnavailableReason(liveUnavailableReason)
          : null;
      return {
        title: fromReason?.title ?? "Analysis unavailable",
        description:
          liveLine ??
          fromReason?.description ??
          "AI commentary is not available for this fixture.",
        showSkeleton: false,
        showRetry: false,
      };
    }
    case "AI_FAILED":
      return {
        title: "Could not load AI analysis",
        description:
          networkErrorMessage ??
          "The narrative analysis failed to generate. Model probabilities may still be shown when available.",
        showSkeleton: false,
        showRetry: fixturePhase !== "LIVE",
      };
    case "NO_DATA":
      return {
        title: "No model baseline yet",
        description:
          fixturePhase === "LIVE"
            ? "Pre-kickoff and live model outputs are not available for this moment."
            : "Pre-match win probabilities and AI commentary will appear here once this fixture is analyzed.",
        showSkeleton: false,
        showRetry: false,
      };
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
