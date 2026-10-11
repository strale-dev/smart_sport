import type { LivePredictionSourceSnapshot } from "@/lib/predictions/live-prediction-validation";
import type { LivePredictionUnavailableReason } from "@/lib/predictions/live-prediction-validation";
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

export type LivePredictionDeltaSnapshot = PrematchPredictionSnapshot & {
  presentationKind: "LIVE_PROBABILITY";
  expectedGoalsAvailable: boolean;
  predictionId: string;
  liveSnapshotId: string;
  modelVersion: string;
  createdAt: string;
};

export type LiveProbabilityDeltaResponse = {
  prematch: WinProbabilities | null;
  prematchKind: ProbabilityPresentationKind | null;
  live: WinProbabilities | null;
  liveKind: ProbabilityPresentationKind | null;
  liveMinute: number | null;
  liveAvailable: boolean;
  unavailableReason: LivePredictionUnavailableReason | null;
  sourceSnapshot: LivePredictionSourceSnapshot | null;
  prematchPrediction: PrematchPredictionDeltaSnapshot | null;
  livePrediction: LivePredictionDeltaSnapshot | null;
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
