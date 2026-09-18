import type {
  PrematchPredictionSnapshot,
  WinProbabilities,
} from "@/types/prediction";

export type LiveProbabilityDeltaResponse = {
  prematch: WinProbabilities | null;
  live: WinProbabilities | null;
  liveMinute: number | null;
  prematchPrediction: PrematchPredictionSnapshot | null;
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
