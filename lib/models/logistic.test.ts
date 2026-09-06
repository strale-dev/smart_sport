import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";
import {
  computeLogisticProbabilities,
  probabilitiesSum,
  summarizeProbabilityDistribution,
} from "@/lib/models/logistic";
import type { PrematchFeatureVector } from "@/types/prediction";

function buildFeature(
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
    form5HomePpg: 1.4,
    form5AwayPpg: 1.4,
    form10HomePpg: 1.5,
    form10AwayPpg: 1.5,
    h2hHomeWinRate: 0.5,
    h2hGoalAvg: 2.5,
    homeLeagueRank: 8,
    awayLeagueRank: 8,
    leaguePositionDiff: 0,
    homeRestDays: 7,
    awayRestDays: 7,
    homeGoalsForAvg: 1.4,
    awayGoalsForAvg: 1.4,
    homeGoalsAgainstAvg: 1.1,
    awayGoalsAgainstAvg: 1.1,
    homeXgForAvg: null,
    awayXgForAvg: null,
    homeXgAgainstAvg: null,
    awayXgAgainstAvg: null,
    hasXg: false,
    dataQuality: "PARTIAL",
    ...overrides,
  };
}

describe("logistic", () => {
  it("returns probabilities that sum to 1", () => {
    const probabilities = computeLogisticProbabilities(
      buildFeature(),
      DEFAULT_MODEL_COEFFICIENTS.logistic
    );
    expect(probabilitiesSum(probabilities)).toBeCloseTo(1, 2);
  });

  it("gives the favorite at least 40% in a strong home scenario", () => {
    const probabilities = computeLogisticProbabilities(
      buildFeature({
        eloDiff: 180,
        form5HomePpg: 2.4,
        form5AwayPpg: 0.8,
        leaguePositionDiff: 8,
      }),
      DEFAULT_MODEL_COEFFICIENTS.logistic
    );

    expect(probabilities.home).toBeGreaterThanOrEqual(0.4);
  });

  it("does not collapse strong favorites into a flat 33/33/33 shape", () => {
    const samples = [
      computeLogisticProbabilities(
        buildFeature({ eloDiff: 160, form5HomePpg: 2.2, form5AwayPpg: 0.9 }),
        DEFAULT_MODEL_COEFFICIENTS.logistic
      ),
      computeLogisticProbabilities(
        buildFeature({ eloDiff: -140, form5HomePpg: 0.9, form5AwayPpg: 2.1 }),
        DEFAULT_MODEL_COEFFICIENTS.logistic
      ),
      computeLogisticProbabilities(
        buildFeature({ eloDiff: 0, form5HomePpg: 1.5, form5AwayPpg: 1.5 }),
        DEFAULT_MODEL_COEFFICIENTS.logistic
      ),
    ];

    const summary = summarizeProbabilityDistribution(samples);
    expect(summary.medianMaxProb).toBeGreaterThan(0.35);
    expect(summary.maxMaxProb).toBeLessThan(0.9);
  });
});
