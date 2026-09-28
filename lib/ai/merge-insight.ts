import { resolveDisplayDataQuality } from "@/lib/ai/data-coverage";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import { normalizeWinProbabilitiesWithFloor } from "@/lib/models/normalize-probabilities";
import type {
  AIInsightNarrativePayload,
  AIInsightPayload,
} from "@/lib/ai/schemas";
import type { PrematchPredictionResult } from "@/types/prediction";

export type MergeInsightCoverage = {
  dataAvailable: string[];
  dataMissing: string[];
};

export type MergePredictionInput = {
  winProbabilities: PrematchPredictionResult["winProbabilities"];
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  weakerTeamScoringProb: number;
  confidence: PrematchPredictionResult["confidence"];
  predictedOutcome: PrematchPredictionResult["predictedOutcome"];
  inputSnapshot?: { dataQuality: "COMPLETE" | "PARTIAL" };
};

export function mergeNarrativeWithPrediction(
  narrative: AIInsightNarrativePayload,
  prediction: MergePredictionInput,
  coverage?: MergeInsightCoverage
): AIInsightPayload {
  const winProbabilities = normalizeWinProbabilitiesWithFloor(
    prediction.winProbabilities
  );
  const winOutcome = predictedOutcomeFromProbabilities(winProbabilities);

  return {
    summary: narrative.summary,
    advantage: narrative.advantage,
    winOutcome,
    winProbabilities,
    expectedGoalsRange: [
      prediction.expectedGoalsTotalMin,
      prediction.expectedGoalsTotalMax,
    ],
    weakerTeamScoringChance: prediction.weakerTeamScoringProb,
    confidence: prediction.confidence,
    keyFactors: narrative.keyFactors,
    scenarios: narrative.scenarios,
    commentary: narrative.commentary,
    dataUsed: narrative.dataUsed,
    dataTimestamp: narrative.dataTimestamp,
    dataQuality: coverage
      ? resolveDisplayDataQuality({
          dataMissing: coverage.dataMissing,
          predictionDataQuality:
            prediction.inputSnapshot?.dataQuality ?? "COMPLETE",
        })
      : narrative.dataQuality,
  };
}
