import { describe, expect, it } from "vitest";

import { mergeNarrativeWithPrediction } from "@/lib/ai/merge-insight";
import { sampleNarrativeForMerge } from "@/lib/ai/test-fixtures";

describe("mergeNarrativeWithPrediction", () => {
  it("uses prediction engine numbers for probabilities and goals", () => {
    const merged = mergeNarrativeWithPrediction(
      sampleNarrativeForMerge,
      {
        winProbabilities: { home: 0.52, draw: 0.26, away: 0.22 },
        expectedGoalsTotalMin: 2,
        expectedGoalsTotalMax: 3.5,
        weakerTeamScoringProb: 0.41,
        confidence: "MEDIUM",
        predictedOutcome: "1",
        inputSnapshot: { dataQuality: "COMPLETE" },
      } as Parameters<typeof mergeNarrativeWithPrediction>[1],
      {
        dataAvailable: ["Model prediction", "Team form"],
        dataMissing: ["Head-to-head"],
      }
    );

    expect(merged.winProbabilities.home).toBe(0.52);
    expect(merged.winOutcome).toBe("1");
    expect(merged.confidence).toBe("MEDIUM");
    expect(merged.expectedGoalsRange).toEqual([2, 3.5]);
    expect(merged.dataUsed).toContain("Team form");
    expect(merged.dataQuality).toBe("PARTIAL");
  });
});
