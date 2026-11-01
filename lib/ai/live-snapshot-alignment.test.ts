import { describe, expect, it } from "vitest";

import { liveSnapshotIdFromPrediction } from "@/lib/ai/context-hash-input";
import type { LivePredictionResult } from "@/types/prediction";

function minimalLivePrediction(
  partial: Partial<LivePredictionResult> = {}
): LivePredictionResult {
  const base: LivePredictionResult = {
    fixtureId: "f-uuid",
    fixtureExternalId: 42,
    modelVersionId: "mv",
    modelVersion: "1.0.0",
    predictionId: "pred-live-1",
    liveSnapshotId: "",
    type: "LIVE",
    presentationKind: "LIVE_PROBABILITY",
    minute: 55,
    winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
    expectedGoalsHome: 1.2,
    expectedGoalsAway: 0.9,
    expectedGoalsTotal: 2.1,
    expectedGoalsTotalMin: 2,
    expectedGoalsTotalMax: 3,
    over2Prob: 0.5,
    over3Prob: 0.3,
    under2Prob: 0.5,
    bttsProb: 0.5,
    weakerTeamScoringProb: 0.4,
    confidence: "MEDIUM",
    predictedOutcome: "1",
    inputSnapshot: {
      fixtureExternalId: 42,
      asOf: "2026-09-07T19:30:00.000Z",
      minute: 55,
      scoreHome: 2,
      scoreAway: 1,
      redCardsHome: 0,
      redCardsAway: 0,
      shotsOnTargetHome: null,
      shotsOnTargetAway: null,
      xgHome: 1.8,
      xgAway: 0.7,
      possessionHome: null,
      possessionAway: null,
      cornersHome: null,
      cornersAway: null,
      anchorWinProbabilities: { home: 0.45, draw: 0.3, away: 0.25 },
      priorWinProbabilities: { home: 0.45, draw: 0.3, away: 0.25 },
      dataQuality: "PARTIAL",
    },
    createdAt: "2026-09-07T19:30:01.000Z",
    fromCache: false,
    ...partial,
  };
  base.liveSnapshotId = liveSnapshotIdFromPrediction(base);
  return base;
}

describe("live snapshot alignment", () => {
  it("uses the same liveSnapshotId on prediction rows and delta-style payloads", () => {
    const prediction = minimalLivePrediction();
    const deltaStyle = {
      predictionId: prediction.predictionId,
      liveSnapshotId: prediction.liveSnapshotId,
    };

    expect(deltaStyle.liveSnapshotId).toBe(
      liveSnapshotIdFromPrediction(prediction)
    );
    expect(deltaStyle.predictionId).toBe("pred-live-1");
  });
});
