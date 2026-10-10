import { describe, expect, it } from "vitest";

import {
  asLiveProbability,
  asPreMatchProbability,
  isLiveProbabilityPresentation,
  isPreMatchProbabilityPresentation,
} from "@/types/probability-presentation";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

const prematchBase: PrematchPredictionResult = {
  fixtureId: "f1",
  fixtureExternalId: 1,
  modelVersionId: "mv",
  modelVersion: "1.0.0",
  predictionId: "p1",
  type: "PREMATCH",
  presentationKind: "PRE_MATCH_PROBABILITY",
  modelTier: "FIXTURE_SPECIFIC",
  inputSnapshotFingerprint: "abc",
  expectedGoalsAvailable: true,
  winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
  expectedGoalsHome: 1.5,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.6,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  bttsProb: 0.5,
  weakerTeamScoringProb: 0.4,
  over2Prob: 0.55,
  over3Prob: 0.3,
  under2Prob: 0.45,
  confidence: "MEDIUM",
  predictedOutcome: "1",
  inputSnapshot: {} as PrematchPredictionResult["inputSnapshot"],
  createdAt: "2026-01-01T00:00:00.000Z",
  fromCache: true,
};

describe("probability presentation kinds", () => {
  it("tags pre-match and live bundles distinctly", () => {
    const pre = asPreMatchProbability(prematchBase);
    expect(pre.kind).toBe("PRE_MATCH_PROBABILITY");
    expect(isPreMatchProbabilityPresentation(pre)).toBe(true);
    expect(isLiveProbabilityPresentation(pre)).toBe(false);

    const live: LivePredictionResult = {
      ...prematchBase,
      type: "LIVE",
      presentationKind: "LIVE_PROBABILITY",
      minute: 55,
      inputSnapshot: {} as LivePredictionResult["inputSnapshot"],
    };
    const liveBundle = asLiveProbability(live);
    expect(liveBundle.kind).toBe("LIVE_PROBABILITY");
    expect(isLiveProbabilityPresentation(liveBundle)).toBe(true);
  });
});
