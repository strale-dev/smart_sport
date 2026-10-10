import type { ProbabilityPresentationKind } from "@/types/probability-presentation";
import type {
  PrematchModelTier,
  PrematchPredictionSnapshot,
  WinProbabilities,
} from "@/types/prediction";

export type PrematchPredictionDeltaSnapshot = PrematchPredictionSnapshot & {
  presentationKind: "PRE_MATCH_PROBABILITY";
  modelTier: PrematchModelTier;
  expectedGoalsAvailable: boolean;
  predictionId: string;
  modelVersion: string;
  createdAt: string;
};

export type LiveProbabilityDeltaResponse = {
  prematch: WinProbabilities | null;
  prematchKind: ProbabilityPresentationKind | null;
  live: WinProbabilities | null;
  liveKind: ProbabilityPresentationKind | null;
  liveMinute: number | null;
  prematchPrediction: PrematchPredictionDeltaSnapshot | null;
};

export async function fetchLiveProbabilityDelta(
  fixtureProviderId: number
): Promise<LiveProbabilityDeltaResponse> {
  const response = await fetch(
    `/api/matches/${fixtureProviderId}/live-probability-delta`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`live_probability_delta_${response.status}`);
  }

  return (await response.json()) as LiveProbabilityDeltaResponse;
}
