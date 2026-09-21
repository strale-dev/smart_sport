import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";
import { computePoissonOutput } from "@/lib/models/poisson";
import type { PrematchFeatureVector } from "@/types/prediction";

const baseFeature: PrematchFeatureVector = {
  fixtureExternalId: 1,
  asOf: "2026-03-01T15:00:00.000Z",
  homeTeamProviderId: 10,
  awayTeamProviderId: 20,
  leagueProviderId: 39,
  eloHome: 1550,
  eloAway: 1450,
  eloDiff: 100,
  form5HomePpg: 2,
  form5AwayPpg: 1,
  form5HomeVenuePpg: 2.2,
  form5AwayVenuePpg: 0.8,
  form10HomePpg: 1.8,
  form10AwayPpg: 1.2,
  h2hHomeWinRate: 0.6,
  h2hGoalAvg: 2.8,
  homeLeagueRank: 4,
  awayLeagueRank: 10,
  leaguePositionDiff: 6,
  homeStandingPoints: 45,
  awayStandingPoints: 30,
  standingPointsDiff: 15,
  homeRestDays: 6,
  awayRestDays: 4,
  homeGoalsForAvg: 1.8,
  awayGoalsForAvg: 1.1,
  homeGoalsAgainstAvg: 1,
  awayGoalsAgainstAvg: 1.4,
  homeXgForAvg: 1.7,
  awayXgForAvg: 1.2,
  homeXgAgainstAvg: 1.1,
  awayXgAgainstAvg: 1.3,
  homeInjuryImpact: 0.1,
  awayInjuryImpact: null,
  homeTopScorersSidelined: 1,
  awayTopScorersSidelined: 0,
  lineupsState: "CONFIRMED",
  hasXg: true,
  dataQuality: "COMPLETE",
};

describe("poisson", () => {
  it("returns positive lambdas and bounded probabilities", () => {
    const output = computePoissonOutput(
      baseFeature,
      DEFAULT_MODEL_COEFFICIENTS.poisson
    );

    expect(output.expectedGoalsHome).toBeGreaterThan(0);
    expect(output.expectedGoalsAway).toBeGreaterThan(0);
    expect(output.bttsProb).toBeGreaterThanOrEqual(0);
    expect(output.bttsProb).toBeLessThanOrEqual(1);
    expect(output.weakerTeamScoringProb).toBeGreaterThanOrEqual(0);
    expect(output.weakerTeamScoringProb).toBeLessThanOrEqual(1);
    expect(output.expectedGoalsTotalMax).toBeGreaterThanOrEqual(
      output.expectedGoalsTotalMin
    );
    expect(output.expectedGoalsTotal).toBeGreaterThan(0);
    expect(output.over3Prob).toBeLessThanOrEqual(output.over2Prob);
    expect(output.expectedGoalsTotalMax).toBeGreaterThanOrEqual(
      Math.floor(output.expectedGoalsTotal)
    );
  });
});
