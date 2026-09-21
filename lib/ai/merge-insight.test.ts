import { describe, expect, it } from "vitest";

import { mergeNarrativeWithPrediction } from "@/lib/ai/merge-insight";

describe("mergeNarrativeWithPrediction", () => {
  it("uses prediction engine numbers for probabilities and goals", () => {
    const merged = mergeNarrativeWithPrediction(
      {
        summary: "Home edge based on recent form at home.",
        advantage: "HOME",
        keyFactors: [
          {
            label: "Form",
            weight: 0.5,
            evidence: "Home team won 3 of last 5 home matches.",
          },
          {
            label: "Standings",
            weight: 0.3,
            evidence: "Home team sit 4th on 12 points.",
          },
        ],
        scenarios: {
          likely: "Home win",
          best: "Comfortable home win",
          upset: "Away steal a point",
        },
        commentary:
          "The model favours the home side with a 52% win probability while away win sits near 22%.",
        dataUsed: ["Model prediction", "Team form"],
        dataTimestamp: "2026-09-01T12:00:00.000Z",
        dataQuality: "PARTIAL",
      },
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
