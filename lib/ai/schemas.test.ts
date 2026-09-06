import { describe, expect, it } from "vitest";

import { AIInsightSchema } from "@/lib/ai/schemas";

const validInsight = {
  summary: "Home side enter with a narrow statistical edge in this fixture.",
  advantage: "HOME" as const,
  winOutcome: "1" as const,
  winProbabilities: {
    home: 0.48,
    draw: 0.27,
    away: 0.25,
  },
  expectedGoalsRange: [2, 3] as [number, number],
  weakerTeamScoringChance: 0.31,
  confidence: "MEDIUM" as const,
  keyFactors: [
    {
      label: "Recent form",
      weight: 0.4,
      evidence: "Home team averaged 2.1 ppg over the last five matches.",
    },
    {
      label: "Head-to-head",
      weight: 0.3,
      evidence: "The last three meetings produced two home wins.",
    },
  ],
  scenarios: {
    likely: "A tight home win with both teams scoring.",
    best: "Home team control early and win comfortably.",
    upset: "Away team absorb pressure and win on the counter.",
  },
  commentary:
    "The model gives the home team a modest edge driven by stronger recent form and home advantage. Data quality is solid but not complete, so confidence stays medium rather than high.",
  dataTimestamp: new Date().toISOString(),
  dataQuality: "PARTIAL" as const,
};

describe("AIInsightSchema", () => {
  it("accepts a valid structured insight", () => {
    const parsed = AIInsightSchema.parse(validInsight);
    expect(parsed.winOutcome).toBe("1");
  });

  it("rejects probabilities that do not sum to 1", () => {
    expect(() =>
      AIInsightSchema.parse({
        ...validInsight,
        winProbabilities: {
          home: 0.2,
          draw: 0.2,
          away: 0.2,
        },
      })
    ).toThrow();
  });

  it("rejects winOutcome that disagrees with the highest probability", () => {
    expect(() =>
      AIInsightSchema.parse({
        ...validInsight,
        winOutcome: "2",
      })
    ).toThrow();
  });
});
