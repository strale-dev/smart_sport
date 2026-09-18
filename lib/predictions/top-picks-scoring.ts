import type { AiConfidence } from "@/types/prediction";
import type { PredictionDataQuality } from "@/types/prediction";

import { maxWinProbability } from "@/lib/models/confidence";

export const CONFIDENCE_SCORE: Record<AiConfidence, number> = {
  HIGH: 1,
  MEDIUM: 0.85,
  LOW: 0.65,
};

export const DATA_QUALITY_SCORE: Record<PredictionDataQuality, number> = {
  COMPLETE: 1,
  PARTIAL: 0.75,
};

export function rankScore(input: {
  winProbabilities: { home: number; draw: number; away: number };
  confidence: AiConfidence;
  dataQuality: PredictionDataQuality;
}): number {
  const modelProbability = maxWinProbability(input.winProbabilities);
  return (
    modelProbability *
    CONFIDENCE_SCORE[input.confidence] *
    DATA_QUALITY_SCORE[input.dataQuality]
  );
}

export function dataQualityMeetsMinimum(
  value: PredictionDataQuality,
  minimum: PredictionDataQuality
): boolean {
  if (minimum === "PARTIAL") {
    return value === "PARTIAL" || value === "COMPLETE";
  }
  return value === "COMPLETE";
}
