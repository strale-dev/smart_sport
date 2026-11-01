import { describe, expect, it } from "vitest";

import {
  computePrematchFeatureFingerprint,
  prematchFeatureFingerprintPayload,
} from "@/lib/models/prematch-feature-fingerprint";
import type { PrematchFeatureVector } from "@/types/prediction";

const base: PrematchFeatureVector = {
  fixtureExternalId: 99,
  asOf: "2026-03-01T15:00:00.000Z",
  homeTeamProviderId: 1,
  awayTeamProviderId: 2,
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
};

describe("prematch feature fingerprint", () => {
  it("changes when form signal arrives", () => {
    const empty = computePrematchFeatureFingerprint(base);
    const withForm = computePrematchFeatureFingerprint({
      ...base,
      form5HomePpg: 1.6,
      form5AwayPpg: 1.2,
    });
    expect(empty).not.toBe(withForm);
  });

  it("ignores non-model metadata in payload", () => {
    const payload = prematchFeatureFingerprintPayload(base);
    expect(payload).not.toHaveProperty("dataQuality");
  });

  it("changes when fixture identity fields change", () => {
    const a = computePrematchFeatureFingerprint(base);
    const b = computePrematchFeatureFingerprint({
      ...base,
      homeTeamProviderId: 99,
    });
    expect(a).not.toBe(b);
  });
});
