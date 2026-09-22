import { describe, expect, it } from "vitest";

import {
  hasMinimumModelSignal,
  PREMATCH_LLM_ACTIVE_MS,
  PREMATCH_SCHEDULED_LEAD_MS,
  resolvePrematchDisplayExperience,
} from "@/lib/ai/prematch-availability";
import { GENERIC_BASELINE_WIN_PROBABILITIES } from "@/lib/models/prematch-model-signal";
import type { PrematchFeatureVector } from "@/types/prediction";
import type { PrematchPredictionResult } from "@/types/prediction";

function baseFeatures(
  overrides: Partial<PrematchFeatureVector> = {}
): PrematchFeatureVector {
  return {
    fixtureExternalId: 1,
    asOf: "2026-03-01T15:00:00.000Z",
    homeTeamProviderId: 10,
    awayTeamProviderId: 20,
    leagueProviderId: 39,
    eloHome: 1500,
    eloAway: 1500,
    eloDiff: 0,
    form5HomePpg: null,
    form5AwayPpg: null,
    form5HomeVenuePpg: null,
    form5AwayVenuePpg: null,
    form10HomePpg: null,
    form10AwayPpg: null,
    h2hHomeWinRate: null,
    h2hGoalAvg: null,
    homeLeagueRank: null,
    awayLeagueRank: null,
    leaguePositionDiff: null,
    homeStandingPoints: null,
    awayStandingPoints: null,
    standingPointsDiff: null,
    homeRestDays: null,
    awayRestDays: null,
    homeGoalsForAvg: null,
    awayGoalsForAvg: null,
    homeGoalsAgainstAvg: null,
    awayGoalsAgainstAvg: null,
    homeXgForAvg: null,
    awayXgForAvg: null,
    homeXgAgainstAvg: null,
    awayXgAgainstAvg: null,
    homeInjuryImpact: null,
    awayInjuryImpact: null,
    homeTopScorersSidelined: 0,
    awayTopScorersSidelined: 0,
    lineupsState: "MISSING",
    hasXg: false,
    dataQuality: "PARTIAL",
    ...overrides,
  };
}

function basePrediction(
  overrides: Partial<PrematchPredictionResult> = {}
): PrematchPredictionResult {
  return {
    type: "PREMATCH",
    fixtureExternalId: 1,
    fixtureId: "uuid",
    modelVersionId: "mv",
    modelVersion: "1.0.0",
    predictionId: "p1",
    inputSnapshot: baseFeatures(),
    createdAt: "2026-01-01T00:00:00.000Z",
    fromCache: false,
    winProbabilities: GENERIC_BASELINE_WIN_PROBABILITIES,
    predictedOutcome: "1",
    expectedGoalsHome: 1.4,
    expectedGoalsAway: 1.1,
    expectedGoalsTotal: 2.5,
    expectedGoalsTotalMin: 2,
    expectedGoalsTotalMax: 3,
    over2Prob: 0.5,
    over3Prob: 0.3,
    under2Prob: 0.5,
    bttsProb: 0.5,
    weakerTeamScoringProb: 0.4,
    confidence: "MEDIUM",
    ...overrides,
  };
}

describe("prematch availability", () => {
  it("schedules far fixtures without specific model signal", () => {
    const kickoffAt = new Date(
      Date.now() + PREMATCH_SCHEDULED_LEAD_MS + 3_600_000
    ).toISOString();

    const experience = resolvePrematchDisplayExperience({
      kickoffAt,
      fixturePhase: "PREMATCH",
      hookState: "generating",
      hasInsight: false,
      prediction: basePrediction(),
    });

    expect(experience.tier).toBe("scheduled");
    expect(experience.showModelPrediction).toBe(false);
    expect(experience.shouldAutoGenerateNarrative).toBe(false);
  });

  it("shows model-only when prediction is fixture-specific", () => {
    const kickoffAt = new Date(Date.now() + 12 * 3_600_000).toISOString();
    const features = baseFeatures({
      form5HomePpg: 1.8,
      form5AwayPpg: 1.1,
    });
    const prediction = basePrediction({
      inputSnapshot: features,
      winProbabilities: { home: 0.62, draw: 0.22, away: 0.16 },
    });

    const experience = resolvePrematchDisplayExperience({
      kickoffAt,
      fixturePhase: "PREMATCH",
      hookState: "generating",
      hasInsight: false,
      prediction,
    });

    expect(experience.tier).toBe("narrative_generating");
    expect(experience.showModelPrediction).toBe(true);
    expect(experience.showNarrative).toBe(false);
    expect(experience.shouldAutoGenerateNarrative).toBe(true);
  });

  it("does not auto-generate narrative outside LLM window", () => {
    const kickoffAt = new Date(
      Date.now() + PREMATCH_LLM_ACTIVE_MS + 3_600_000
    ).toISOString();
    const prediction = basePrediction({
      inputSnapshot: baseFeatures({ form5HomePpg: 2, form5AwayPpg: 1 }),
      winProbabilities: { home: 0.55, draw: 0.25, away: 0.2 },
    });

    const experience = resolvePrematchDisplayExperience({
      kickoffAt,
      fixturePhase: "PREMATCH",
      hookState: "miss",
      hasInsight: false,
      prediction,
    });

    expect(experience.tier).toBe("model_only");
    expect(experience.shouldAutoGenerateNarrative).toBe(false);
  });

  it("detects minimum model signal from form", () => {
    expect(hasMinimumModelSignal(baseFeatures())).toBe(false);
    expect(
      hasMinimumModelSignal(
        baseFeatures({ form5HomePpg: 1.2, form5AwayPpg: 1.4 })
      )
    ).toBe(true);
  });
});
