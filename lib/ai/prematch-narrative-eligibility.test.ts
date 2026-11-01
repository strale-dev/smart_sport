import { describe, expect, it } from "vitest";

import {
  canGeneratePrematchNarrative,
  isFixtureSpecificPrematchModel,
} from "@/lib/ai/prematch-availability";
import { GENERIC_BASELINE_WIN_PROBABILITIES } from "@/lib/models/prematch-model-signal";
import type { PrematchFeatureVector } from "@/types/prediction";

const baseFeatures: PrematchFeatureVector = {
  fixtureExternalId: 1,
  homeTeamProviderId: 1,
  awayTeamProviderId: 2,
  leagueProviderId: 39,
  asOf: "2026-09-26T12:00:00.000Z",
  dataQuality: "PARTIAL",
  hasXg: false,
  eloHome: 1500,
  eloAway: 1500,
  eloDiff: 0,
  form5HomePpg: 1.4,
  form5AwayPpg: 1.1,
  form10HomePpg: null,
  form10AwayPpg: null,
  form5HomeVenuePpg: null,
  form5AwayVenuePpg: null,
  homeLeagueRank: null,
  awayLeagueRank: null,
  homeGoalsForAvg: null,
  awayGoalsForAvg: null,
  homeGoalsAgainstAvg: null,
  awayGoalsAgainstAvg: null,
  homeXgForAvg: null,
  awayXgForAvg: null,
  homeXgAgainstAvg: null,
  awayXgAgainstAvg: null,
  h2hHomeWinRate: null,
  h2hGoalAvg: null,
  homeRestDays: null,
  awayRestDays: null,
  homeInjuryImpact: null,
  awayInjuryImpact: null,
  homeTopScorersSidelined: 0,
  awayTopScorersSidelined: 0,
  homeStandingPoints: null,
  awayStandingPoints: null,
  leaguePositionDiff: null,
  standingPointsDiff: null,
  lineupsState: "MISSING",
};

describe("canGeneratePrematchNarrative", () => {
  it("blocks when minimum model signal is missing", () => {
    expect(
      canGeneratePrematchNarrative(
        { ...baseFeatures, form5HomePpg: null, form5AwayPpg: 1.2 },
        {
          winProbabilities: GENERIC_BASELINE_WIN_PROBABILITIES,
          modelTier: "GENERIC_BASELINE",
        }
      )
    ).toBe(false);
  });

  it("allows narrative when signal exists but probabilities are generic baseline", () => {
    expect(
      canGeneratePrematchNarrative(baseFeatures, {
        winProbabilities: GENERIC_BASELINE_WIN_PROBABILITIES,
        modelTier: "GENERIC_BASELINE",
      })
    ).toBe(true);
    expect(
      isFixtureSpecificPrematchModel(baseFeatures, {
        winProbabilities: GENERIC_BASELINE_WIN_PROBABILITIES,
        modelTier: "GENERIC_BASELINE",
      })
    ).toBe(false);
  });

  it("allows fixture-specific predictions", () => {
    expect(
      canGeneratePrematchNarrative(baseFeatures, {
        winProbabilities: { home: 0.62, draw: 0.22, away: 0.16 },
        modelTier: "FIXTURE_SPECIFIC",
      })
    ).toBe(true);
  });
});
