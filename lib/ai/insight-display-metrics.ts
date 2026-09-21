import type { StoredAIInsight } from "@/lib/ai/schemas";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

export type InsightDisplayPrediction =
  | PrematchPredictionResult
  | LivePredictionResult
  | Pick<
      PrematchPredictionResult,
      | "winProbabilities"
      | "predictedOutcome"
      | "confidence"
      | "expectedGoalsTotalMin"
      | "expectedGoalsTotalMax"
      | "expectedGoalsTotal"
      | "over2Prob"
      | "over3Prob"
      | "weakerTeamScoringProb"
    >;

/** Numeric forecast fields always come from the prediction engine when available. */
export function resolveInsightDisplayMetrics(
  insight: Pick<
    StoredAIInsight,
    | "winProbabilities"
    | "winOutcome"
    | "confidence"
    | "expectedGoalsRange"
    | "weakerTeamScoringChance"
  >,
  prediction: InsightDisplayPrediction | null
): {
  winProbabilities: StoredAIInsight["winProbabilities"];
  winOutcome: StoredAIInsight["winOutcome"];
  confidence: StoredAIInsight["confidence"];
  expectedGoalsRange: StoredAIInsight["expectedGoalsRange"];
  expectedGoalsTotal: number | null;
  over2Prob: number | null;
  over3Prob: number | null;
  weakerTeamScoringChance: StoredAIInsight["weakerTeamScoringChance"];
} {
  if (!prediction) {
    return {
      winProbabilities: insight.winProbabilities,
      winOutcome: insight.winOutcome,
      confidence: insight.confidence,
      expectedGoalsRange: insight.expectedGoalsRange,
      expectedGoalsTotal: null,
      over2Prob: null,
      over3Prob: null,
      weakerTeamScoringChance: insight.weakerTeamScoringChance,
    };
  }

  return {
    winProbabilities: prediction.winProbabilities,
    winOutcome: prediction.predictedOutcome,
    confidence: prediction.confidence,
    expectedGoalsRange: [
      prediction.expectedGoalsTotalMin,
      prediction.expectedGoalsTotalMax,
    ],
    expectedGoalsTotal: prediction.expectedGoalsTotal,
    over2Prob: prediction.over2Prob,
    over3Prob: prediction.over3Prob,
    weakerTeamScoringChance: prediction.weakerTeamScoringProb,
  };
}
