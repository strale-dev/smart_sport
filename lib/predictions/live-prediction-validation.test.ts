import { describe, expect, it } from "vitest";

import {
  validateLiveFeatureSnapshotAgainstFixture,
  validateLivePredictionResult,
} from "@/lib/predictions/live-prediction-validation";
import type {
  LiveFeatureVector,
  LivePredictionResult,
} from "@/types/prediction";

function livePrediction(
  partial: Partial<LiveFeatureVector> & {
    winProbabilities?: LivePredictionResult["winProbabilities"];
  }
): LivePredictionResult {
  const snapshot: LiveFeatureVector = {
    fixtureExternalId: 42,
    asOf: "2026-09-07T19:30:00.000Z",
    minute: partial.minute ?? 15,
    scoreHome: partial.scoreHome ?? 0,
    scoreAway: partial.scoreAway ?? 0,
    redCardsHome: 0,
    redCardsAway: 0,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    xgHome: null,
    xgAway: null,
    possessionHome: null,
    possessionAway: null,
    cornersHome: null,
    cornersAway: null,
    anchorWinProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
    priorWinProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
    dataQuality: "PARTIAL",
    ...partial,
  };

  return {
    fixtureId: "uuid",
    fixtureExternalId: 42,
    modelVersionId: "mv",
    modelVersion: "1.0.0",
    predictionId: "pred-1",
    liveSnapshotId: "snap",
    type: "LIVE",
    presentationKind: "LIVE_PROBABILITY",
    minute: snapshot.minute,
    winProbabilities: partial.winProbabilities ?? {
      home: 0.85,
      draw: 0.1,
      away: 0.05,
    },
    expectedGoalsHome: 2,
    expectedGoalsAway: 0.5,
    expectedGoalsTotal: 2.5,
    expectedGoalsTotalMin: 2,
    expectedGoalsTotalMax: 3,
    over2Prob: 0.5,
    over3Prob: 0.3,
    under2Prob: 0.5,
    bttsProb: 0.4,
    weakerTeamScoringProb: 0.2,
    confidence: "HIGH",
    predictedOutcome: "1",
    inputSnapshot: snapshot,
    createdAt: "2026-09-07T19:30:01.000Z",
    fromCache: false,
  };
}

describe("validateLiveFeatureSnapshotAgainstFixture", () => {
  it("audit repro: rejects LIVE row 0-0 @15' when fixture is 2-0 @75'", () => {
    const prediction = livePrediction({
      minute: 15,
      scoreHome: 0,
      scoreAway: 0,
      winProbabilities: { home: 0.93, draw: 0.05, away: 0.02 },
    });

    const result = validateLivePredictionResult({
      fixture: {
        fixtureExternalId: 42,
        status: "2H",
        minute: 75,
        scoreHome: 2,
        scoreAway: 0,
      },
      prediction,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("SCORE_MISMATCH");
    }
  });

  it("accepts aligned snapshot for 2-0 @75'", () => {
    const prediction = livePrediction({
      minute: 75,
      scoreHome: 2,
      scoreAway: 0,
    });

    const result = validateLiveFeatureSnapshotAgainstFixture({
      fixture: {
        fixtureExternalId: 42,
        status: "2H",
        minute: 75,
        scoreHome: 2,
        scoreAway: 0,
      },
      snapshot: prediction.inputSnapshot,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects fixture id mismatch", () => {
    const prediction = livePrediction({
      fixtureExternalId: 99,
      minute: 60,
      scoreHome: 1,
      scoreAway: 0,
    });

    const result = validateLiveFeatureSnapshotAgainstFixture({
      fixture: {
        fixtureExternalId: 42,
        status: "2H",
        minute: 60,
        scoreHome: 1,
        scoreAway: 0,
      },
      snapshot: prediction.inputSnapshot,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("FIXTURE_ID_MISMATCH");
    }
  });
});
