import { describe, expect, it } from "vitest";

import { buildReadinessFromFeatures } from "@/lib/ingestion/fixture-prematch-readiness";
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

describe("buildReadinessFromFeatures", () => {
  it("marks eligible when both teams have form signal", () => {
    const snapshot = buildReadinessFromFeatures(baseFeatures);
    expect(snapshot.aiEligible).toBe(true);
    expect(snapshot.hasMinimumModelSignal).toBe(true);
    expect(snapshot.reasons).toEqual([]);
  });

  it("marks ineligible when form is incomplete", () => {
    const snapshot = buildReadinessFromFeatures({
      ...baseFeatures,
      form5HomePpg: null,
    });
    expect(snapshot.aiEligible).toBe(false);
    expect(snapshot.reasons).toContain("incomplete_form_both_teams");
  });

  it("returns features_unavailable when features are null", () => {
    const snapshot = buildReadinessFromFeatures(null);
    expect(snapshot.aiEligible).toBe(false);
    expect(snapshot.reasons).toContain("features_unavailable");
  });
});
