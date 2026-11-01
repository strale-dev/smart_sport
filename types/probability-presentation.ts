import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

/** Non-interchangeable probability surfaces — not the DB `prediction_type` enum. */
export type ProbabilityPresentationKind =
  "PRE_MATCH_PROBABILITY" | "LIVE_PROBABILITY" | "POST_MATCH_RESULT";

export type PreMatchProbabilityBundle = PrematchPredictionResult & {
  kind: "PRE_MATCH_PROBABILITY";
};

export type LiveProbabilityBundle = LivePredictionResult & {
  kind: "LIVE_PROBABILITY";
};

/** Final score outcome only (no model probabilities). */
export type PostMatchResultBundle = {
  kind: "POST_MATCH_RESULT";
  fixtureExternalId: number;
  scoreHome: number;
  scoreAway: number;
  status: string;
};

export function asPreMatchProbability(
  result: PrematchPredictionResult
): PreMatchProbabilityBundle {
  return {
    ...result,
    kind: "PRE_MATCH_PROBABILITY",
    presentationKind: "PRE_MATCH_PROBABILITY",
  };
}

export function asLiveProbability(
  result: LivePredictionResult
): LiveProbabilityBundle {
  return {
    ...result,
    kind: "LIVE_PROBABILITY",
    presentationKind: "LIVE_PROBABILITY",
  };
}

export function isPreMatchProbabilityPresentation(
  value: { presentationKind?: ProbabilityPresentationKind } | null | undefined
): value is { presentationKind: "PRE_MATCH_PROBABILITY" } {
  return value?.presentationKind === "PRE_MATCH_PROBABILITY";
}

export function isLiveProbabilityPresentation(
  value: { presentationKind?: ProbabilityPresentationKind } | null | undefined
): value is { presentationKind: "LIVE_PROBABILITY" } {
  return value?.presentationKind === "LIVE_PROBABILITY";
}
