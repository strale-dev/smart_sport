import { describe, expect, it } from "vitest";

import { repairPrematchNarrativeEvidence } from "@/lib/ai/sanitize-prematch-narrative";
import { validateAIInsightPrematchNarrative } from "@/lib/ai/schemas";

const baseAnalysis = {
  matchSummary:
    "Home side hold a modest edge with 57% win probability in the model output for this fixture.",
  homeTeamAnalysis:
    "Home team took 12 points from the last 5 with 8 goals scored and strong home splits in context.",
  awayTeamAnalysis:
    "Away side managed 7 points from 5 with 5 goals conceded showing vulnerability on the road.",
  headToHeadAnalysis: null,
  lineupsAndAbsences: null,
  goalsOutlook:
    "Expected goals land near 1.7 to 1.1 with BTTS at 56% from context.prediction.",
  predictionRationale:
    "Model favours home at 57% with draw 25% and away 17% on the supplied probabilities.",
  risks: [
    "Predicted lineups only, so confirmed XI could shift the edge.",
    "Partial form sample may miss a recent tactical change.",
  ],
  watchFor: ["Confirmed lineups within the hour."],
};

describe("repairPrematchNarrativeEvidence", () => {
  it("adds a digit to key factor evidence when the model omitted numbers", () => {
    const parsed = validateAIInsightPrematchNarrative(
      repairPrematchNarrativeEvidence(
        {
          summary:
            "Home edge is supported by form and model probabilities in context for this match.",
          advantage: "HOME",
          keyFactors: [
            {
              label: "Form",
              weight: 0.4,
              evidence: "Home team have been stronger recently at home.",
            },
            {
              label: "Standings",
              weight: 0.3,
              evidence: "They sit above the visitors in the table.",
            },
            {
              label: "Goals",
              weight: 0.2,
              evidence: "Scoring trends favour the hosts.",
            },
            {
              label: "Model",
              weight: 0.1,
              evidence: "Win probability leans home.",
            },
          ],
          scenarios: {
            likely: "Home win",
            best: "Comfortable home win",
            upset: "Away steal a point",
          },
          dataUsed: ["Model prediction", "Team form"],
          dataTimestamp: "2026-09-01T12:00:00.000Z",
          analysis: baseAnalysis,
        },
        '{"prediction":{"winProbabilities":{"home":0.57,"draw":0.25,"away":0.17}}}'
      )
    );

    expect(
      parsed.keyFactors.every((factor) => /\d/.test(factor.evidence))
    ).toBe(true);
  });
});
