import { describe, expect, it } from "vitest";

import { evaluatePrematchPredictionAccuracy } from "@/lib/match/evaluate-prediction-accuracy";
import { makeMatchTestFixture } from "@/components/match/match-test-fixtures";
import type { PrematchPredictionSnapshot } from "@/types/prediction";

const basePrediction: PrematchPredictionSnapshot = {
  winProbabilities: { home: 0.55, draw: 0.25, away: 0.2 },
  expectedGoalsHome: 1.4,
  expectedGoalsAway: 0.9,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  bttsProb: 0.6,
  weakerTeamScoringProb: 0.55,
  confidence: "MEDIUM",
  predictedOutcome: "1",
};

describe("evaluatePrematchPredictionAccuracy", () => {
  it("marks 1X2 and BTTS hits for a home win with both teams scoring", () => {
    const fixture = makeMatchTestFixture("FT", {
      score: {
        home: 2,
        away: 1,
        halftimeHome: 1,
        halftimeAway: 0,
        fulltimeHome: 2,
        fulltimeAway: 1,
        extratimeHome: null,
        extratimeAway: null,
        penaltyHome: null,
        penaltyAway: null,
      },
    });

    const rows = evaluatePrematchPredictionAccuracy(fixture, basePrediction);
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(byId["1x2"]?.hit).toBe(true);
    expect(byId["btts"]?.hit).toBe(true);
    expect(byId["total_goals"]?.hit).toBe(true);
  });
});
