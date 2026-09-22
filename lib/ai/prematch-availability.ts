import type { PrematchInsightHookState } from "@/lib/ai/prematch-insight-state";
import type { FixturePhase } from "@/lib/ai/status-map";
import { isGenericBaselineWinProbabilities } from "@/lib/models/prematch-model-signal";
import type { PrematchFeatureVector } from "@/types/prediction";
import type { PrematchPredictionResult } from "@/types/prediction";

/** Matches warm-ai-prematch daily window — LLM warm-up starts here. */
export const PREMATCH_LLM_ACTIVE_MS = 36 * 3_600_000;

/** Far fixtures show a scheduled message until closer to kickoff (unless narrative exists). */
export const PREMATCH_SCHEDULED_LEAD_MS = 72 * 3_600_000;

export type PrematchAnalysisDisplayTier =
  | "scheduled"
  | "model_only"
  | "narrative_generating"
  | "narrative_ready"
  | "narrative_unavailable"
  | "none";

export type PrematchDisplayExperience = {
  tier: PrematchAnalysisDisplayTier;
  headline: string | null;
  description: string | null;
  showModelPrediction: boolean;
  showNarrative: boolean;
  shouldAutoGenerateNarrative: boolean;
};

function msUntilKickoff(kickoffAt: string, now: number): number {
  return new Date(kickoffAt).getTime() - now;
}

export function resolvePrematchDisplayExperience(input: {
  kickoffAt: string;
  fixturePhase: FixturePhase;
  hookState: PrematchInsightHookState;
  hasInsight: boolean;
  prediction: PrematchPredictionResult | null;
  now?: number;
}): PrematchDisplayExperience {
  const now = input.now ?? Date.now();
  const untilKickoff = msUntilKickoff(input.kickoffAt, now);

  if (input.fixturePhase === "NEITHER") {
    return {
      tier: "none",
      headline: null,
      description: null,
      showModelPrediction: false,
      showNarrative: false,
      shouldAutoGenerateNarrative: false,
    };
  }

  if (input.fixturePhase === "LIVE" || input.fixturePhase === "FINISHED") {
    if (input.hasInsight && input.hookState === "ok") {
      return {
        tier: "narrative_ready",
        headline: null,
        description: null,
        showModelPrediction: Boolean(input.prediction),
        showNarrative: true,
        shouldAutoGenerateNarrative: false,
      };
    }

    return {
      tier: input.prediction ? "model_only" : "none",
      headline: input.prediction
        ? "Pre-match AI commentary"
        : "Analysis not available",
      description: input.prediction
        ? "Live phase — full pre-match commentary appears here when it was generated before kickoff."
        : "No pre-match analysis was stored for this fixture.",
      showModelPrediction: Boolean(input.prediction),
      showNarrative: false,
      shouldAutoGenerateNarrative: false,
    };
  }

  if (input.hasInsight && input.hookState === "ok") {
    return {
      tier: "narrative_ready",
      headline: null,
      description: null,
      showModelPrediction: Boolean(input.prediction),
      showNarrative: true,
      shouldAutoGenerateNarrative: false,
    };
  }

  const snapshot = input.prediction?.inputSnapshot ?? null;
  const modelIsSpecific =
    input.prediction != null &&
    snapshot != null &&
    isFixtureSpecificPrematchModel(snapshot, input.prediction);

  if (
    untilKickoff > PREMATCH_SCHEDULED_LEAD_MS &&
    !modelIsSpecific &&
    !input.hasInsight
  ) {
    return {
      tier: "scheduled",
      headline: "Analysis scheduled",
      description:
        "Full AI analysis for this fixture will be available closer to kickoff, once enough match data is collected for a fixture-specific model prediction.",
      showModelPrediction: false,
      showNarrative: false,
      shouldAutoGenerateNarrative: false,
    };
  }

  if (input.hookState === "fallback") {
    return {
      tier: "narrative_unavailable",
      headline: "AI commentary unavailable",
      description:
        "The fixture-specific model prediction is shown below. AI commentary could not be generated — try again closer to kickoff.",
      showModelPrediction: modelIsSpecific,
      showNarrative: false,
      shouldAutoGenerateNarrative: false,
    };
  }

  const inLlmWindow = untilKickoff <= PREMATCH_LLM_ACTIVE_MS;

  if (input.hookState === "miss" && modelIsSpecific && !inLlmWindow) {
    return {
      tier: "model_only",
      headline: "Model prediction",
      description:
        "Fixture-specific win probabilities from our pre-match model. AI commentary will be available closer to kickoff.",
      showModelPrediction: true,
      showNarrative: false,
      shouldAutoGenerateNarrative: false,
    };
  }

  if (
    input.hookState === "generating" ||
    input.hookState === "loading" ||
    input.hookState === "miss"
  ) {
    return {
      tier: "narrative_generating",
      headline: modelIsSpecific
        ? "Model prediction ready"
        : "Preparing model prediction",
      description: modelIsSpecific
        ? inLlmWindow
          ? "Win probabilities are fixture-specific. AI commentary is generating or will start closer to kickoff."
          : "Win probabilities are fixture-specific. AI commentary will generate closer to kickoff."
        : "Collecting match data for a fixture-specific model prediction.",
      showModelPrediction: modelIsSpecific,
      showNarrative: false,
      shouldAutoGenerateNarrative:
        inLlmWindow && modelIsSpecific && input.hookState !== "loading",
    };
  }

  if (modelIsSpecific) {
    return {
      tier: "model_only",
      headline: "Model prediction",
      description: inLlmWindow
        ? "Fixture-specific win probabilities from our pre-match model. AI commentary has not been generated yet."
        : "Fixture-specific win probabilities from our pre-match model. AI commentary will be available closer to kickoff.",
      showModelPrediction: true,
      showNarrative: false,
      shouldAutoGenerateNarrative: inLlmWindow,
    };
  }

  return {
    tier: "scheduled",
    headline: "Analysis scheduled",
    description:
      "Not enough data yet for a fixture-specific prediction. Check back closer to kickoff.",
    showModelPrediction: false,
    showNarrative: false,
    shouldAutoGenerateNarrative: false,
  };
}

export function isFixtureSpecificPrematchModel(
  features: PrematchFeatureVector,
  prediction: Pick<PrematchPredictionResult, "winProbabilities">
): boolean {
  if (!hasMinimumModelSignal(features)) {
    return false;
  }

  return !isGenericBaselineWinProbabilities(prediction.winProbabilities);
}

export function hasMinimumModelSignal(
  features: PrematchFeatureVector
): boolean {
  if (features.form5HomePpg != null && features.form5AwayPpg != null) {
    return true;
  }

  if (features.homeLeagueRank != null && features.awayLeagueRank != null) {
    return true;
  }

  if (Math.abs(features.eloDiff) >= 8) {
    return true;
  }

  if (features.h2hHomeWinRate != null && features.h2hGoalAvg != null) {
    return true;
  }

  if (
    features.hasXg &&
    features.homeXgForAvg != null &&
    features.awayXgForAvg != null
  ) {
    return true;
  }

  return false;
}
