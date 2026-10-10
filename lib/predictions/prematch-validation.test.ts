import { describe, expect, it } from "vitest";

import {
  assertSnapshotIdentity,
  assertWinProbabilitiesRaw,
  capConfidenceByDataQuality,
  mapValidatedPrematchRowToResult,
  resolveGoalMarketsFromValidatedRow,
  resolvePrematchModelTier,
  validatePrematchModelOutput,
} from "@/lib/predictions/prematch-validation";
import type {
  PrematchFeatureVector,
  PrematchPredictionRow,
} from "@/types/prediction";

const identity = {
  fixtureExternalId: 99,
  homeTeamProviderId: 1,
  awayTeamProviderId: 2,
  leagueProviderId: 39,
};

const snapshot: PrematchFeatureVector = {
  ...identity,
  asOf: "2026-03-01T15:00:00.000Z",
  eloHome: 1500,
  eloAway: 1500,
  eloDiff: 0,
  form5HomePpg: 1.5,
  form5AwayPpg: 1.2,
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
};

function baseRow(
  overrides: Partial<PrematchPredictionRow> = {}
): PrematchPredictionRow {
  return {
    id: "pred-1",
    fixture_id: "uuid-1",
    model_version_id: "mv-1",
    home_win_prob: 0.5,
    draw_prob: 0.25,
    away_win_prob: 0.25,
    expected_goals_home: 1.4,
    expected_goals_away: 1.1,
    expected_goals_total: 2.5,
    expected_goals_total_min: 2,
    expected_goals_total_max: 3,
    over2_prob: 0.55,
    over3_prob: 0.3,
    btts_prob: 0.5,
    weaker_team_scoring_prob: 0.45,
    confidence: "HIGH",
    input_snapshot: snapshot,
    created_at: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("prematch validation", () => {
  it("rejects fixture id mismatch", () => {
    const result = assertSnapshotIdentity(
      { ...snapshot, fixtureExternalId: 100 },
      identity
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("FIXTURE_ID_MISMATCH");
    }
  });

  it("rejects reversed home/away provider ids", () => {
    const result = assertSnapshotIdentity(
      {
        ...snapshot,
        homeTeamProviderId: 2,
        awayTeamProviderId: 1,
      },
      identity
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("HOME_AWAY_MISMATCH");
    }
  });

  it("rejects invalid win probabilities", () => {
    expect(
      assertWinProbabilitiesRaw({ home: -0.1, draw: 0.5, away: 0.5 }).ok
    ).toBe(false);
    expect(
      assertWinProbabilitiesRaw({ home: 0.5, draw: 0.5, away: 0.5 }).ok
    ).toBe(false);
  });

  it("returns null for invalid row mapping", () => {
    const mapped = mapValidatedPrematchRowToResult({
      row: baseRow({ home_win_prob: 0.9, draw_prob: 0.9, away_win_prob: 0.9 }),
      fixtureExternalId: 99,
      identity,
      modelVersion: "1.0.0",
      fromCache: true,
    });
    expect(mapped).toBeNull();
  });

  it("flags missing xG without fabricating markets from zero", () => {
    const markets = resolveGoalMarketsFromValidatedRow(
      baseRow({
        expected_goals_home: null,
        expected_goals_away: null,
        expected_goals_total: null,
        over2_prob: null,
        over3_prob: null,
      })
    );
    expect(markets.ok).toBe(false);
    if (!markets.ok) {
      expect(markets.reason).toBe("MISSING_EXPECTED_GOALS");
    }
  });

  it("labels generic baseline tier and caps confidence", () => {
    const baselineSnapshot: PrematchFeatureVector = {
      ...snapshot,
      form5HomePpg: null,
      form5AwayPpg: null,
      eloDiff: 0,
    };
    const tier = resolvePrematchModelTier(baselineSnapshot, {
      home: 0.5718,
      draw: 0.2544,
      away: 0.1738,
    });
    expect(tier).toBe("GENERIC_BASELINE");
    expect(capConfidenceByDataQuality("HIGH", baselineSnapshot, tier)).toBe(
      "LOW"
    );
  });

  it("accepts valid model output before persist", () => {
    const result = validatePrematchModelOutput({
      features: snapshot,
      identity,
      homeWinProb: 0.52,
      drawProb: 0.24,
      awayWinProb: 0.24,
      expectedGoalsHome: 1.5,
      expectedGoalsAway: 1.0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.modelTier).toBe("FIXTURE_SPECIFIC");
    }
  });
});
