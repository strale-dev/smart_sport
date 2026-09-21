import { describe, expect, it } from "vitest";

import { mergeNarrativeWithPrediction } from "@/lib/ai/merge-insight";
import {
  AIInsightNarrativeOpenAiSchema,
  AIInsightSchema,
} from "@/lib/ai/schemas";
import { sampleNarrativeForMerge } from "@/lib/ai/test-fixtures";

const narrative = {
  ...sampleNarrativeForMerge,
  dataUsed: ["Model prediction", "Team form", "Head-to-head"],
  dataTimestamp: new Date().toISOString(),
};

const predictionInput = {
  winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  weakerTeamScoringProb: 0.31,
  confidence: "MEDIUM" as const,
  predictedOutcome: "1" as const,
};

describe("AIInsightSchema", () => {
  it("accepts a merged structured insight", () => {
    const parsed = AIInsightSchema.parse(
      mergeNarrativeWithPrediction(narrative, predictionInput)
    );
    expect(parsed.winOutcome).toBe("1");
  });

  it("rejects probabilities below 1% floor", () => {
    expect(() =>
      AIInsightSchema.parse(
        mergeNarrativeWithPrediction(narrative, {
          ...predictionInput,
          winProbabilities: { home: 0.98, draw: 0.01, away: 0.005 },
        })
      )
    ).toThrow();
  });

  it("rejects probabilities that do not sum to 1", () => {
    expect(() =>
      AIInsightSchema.parse(
        mergeNarrativeWithPrediction(narrative, {
          ...predictionInput,
          winProbabilities: { home: 0.2, draw: 0.2, away: 0.2 },
        })
      )
    ).toThrow();
  });

  it("narrative OpenAI schema has no numeric forecast fields", () => {
    expect(Object.keys(AIInsightNarrativeOpenAiSchema.shape)).not.toContain(
      "winProbabilities"
    );
    expect(Object.keys(AIInsightNarrativeOpenAiSchema.shape)).toContain(
      "analysis"
    );
  });
});
