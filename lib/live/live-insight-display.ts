import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import type {
  LivePredictionResult,
  PrematchFeatureVector,
  PrematchPredictionResult,
} from "@/types/prediction";

export function predictionFromDeltaSnapshot(
  fixtureExternalId: number,
  snapshot: NonNullable<LiveProbabilityDeltaResponse["prematchPrediction"]>
): PrematchPredictionResult {
  return {
    predictionId: snapshot.predictionId,
    fixtureId: "",
    fixtureExternalId,
    modelVersionId: "",
    modelVersion: snapshot.modelVersion,
    type: "PREMATCH",
    winProbabilities: snapshot.winProbabilities,
    expectedGoalsHome: snapshot.expectedGoalsHome,
    expectedGoalsAway: snapshot.expectedGoalsAway,
    expectedGoalsTotal: snapshot.expectedGoalsTotal,
    expectedGoalsTotalMin: snapshot.expectedGoalsTotalMin,
    expectedGoalsTotalMax: snapshot.expectedGoalsTotalMax,
    over2Prob: snapshot.over2Prob,
    over3Prob: snapshot.over3Prob,
    under2Prob: snapshot.under2Prob,
    bttsProb: snapshot.bttsProb,
    weakerTeamScoringProb: snapshot.weakerTeamScoringProb,
    confidence: snapshot.confidence,
    predictedOutcome: snapshot.predictedOutcome,
    inputSnapshot: {
      dataQuality: "PARTIAL",
    } as PrematchFeatureVector,
    createdAt: snapshot.createdAt,
    fromCache: true,
  };
}

export function resolveLivePhasePrediction(
  fixtureExternalId: number,
  delta: LiveProbabilityDeltaResponse | undefined,
  historicalPrediction: PrematchPredictionResult | LivePredictionResult | null
): PrematchPredictionResult | LivePredictionResult | null {
  if (delta?.prematchPrediction) {
    return predictionFromDeltaSnapshot(
      fixtureExternalId,
      delta.prematchPrediction
    );
  }

  return historicalPrediction;
}
