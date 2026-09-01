import { describe, expect, it } from "vitest";

import type { Fixture } from "@/types/domain";

import {
  computeFollowBonusFactor,
  computeH2hInterestFactor,
  computeImportanceScore,
  computeKickoffProximityFactor,
  computeTeamRankFactor,
  type ImportanceContext,
} from "./importance-score";

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    externalId: 1,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 100,
      name: "Home FC",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 200,
      name: "Away FC",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-01T15:00:00.000Z",
    status: "NS",
    minute: null,
    score: {
      home: null,
      away: null,
      halftimeHome: null,
      halftimeAway: null,
      fulltimeHome: null,
      fulltimeAway: null,
      extratimeHome: null,
      extratimeAway: null,
      penaltyHome: null,
      penaltyAway: null,
    },
    venue: null,
    referee: null,
    round: null,
    ...overrides,
  };
}

function makeContext(
  overrides: Partial<ImportanceContext> = {}
): ImportanceContext {
  return {
    prestigeByLeagueId: new Map([[39, 95]]),
    standingsByFixtureId: new Map(),
    h2hInterestByFixtureId: new Map(),
    now: new Date("2026-09-01T14:00:00.000Z"),
    ...overrides,
  };
}

describe("computeTeamRankFactor", () => {
  it("normalizes dynamically for an 18-team league", () => {
    expect(
      computeTeamRankFactor({
        homeRank: 1,
        awayRank: 2,
        teamCount: 18,
      })
    ).toBeCloseTo(1);

    expect(
      computeTeamRankFactor({
        homeRank: 10,
        awayRank: 15,
        teamCount: 18,
      })
    ).toBeCloseTo(0.5);
  });

  it("falls back to 1.0 when standings or teamCount are unavailable", () => {
    expect(computeTeamRankFactor(undefined)).toBe(1);
    expect(
      computeTeamRankFactor({
        homeRank: null,
        awayRank: 3,
        teamCount: 18,
      })
    ).toBe(1);
    expect(
      computeTeamRankFactor({
        homeRank: 1,
        awayRank: 2,
        teamCount: null,
      })
    ).toBe(1);
  });
});

describe("computeFollowBonusFactor", () => {
  it("is fixed to 1.0 in v1 without any follow data", () => {
    expect(computeFollowBonusFactor()).toBe(1);
  });
});

describe("computeKickoffProximityFactor", () => {
  it("is symmetric for equal positive and negative delta from kickoff", () => {
    const kickoffAt = "2026-09-01T15:00:00.000Z";
    const twoHoursBefore = new Date("2026-09-01T13:00:00.000Z");
    const twoHoursAfter = new Date("2026-09-01T17:00:00.000Z");

    expect(
      computeKickoffProximityFactor(kickoffAt, twoHoursBefore)
    ).toBeCloseTo(computeKickoffProximityFactor(kickoffAt, twoHoursAfter));
  });

  it("peaks at kickoff time", () => {
    const kickoffAt = "2026-09-01T15:00:00.000Z";
    const atKickoff = new Date(kickoffAt);
    const oneHourBefore = new Date("2026-09-01T14:00:00.000Z");

    expect(computeKickoffProximityFactor(kickoffAt, atKickoff)).toBe(1);
    expect(
      computeKickoffProximityFactor(kickoffAt, oneHourBefore)
    ).toBeLessThan(1);
  });
});

describe("computeH2hInterestFactor", () => {
  it("falls back to 1.0 when h2h density is missing", () => {
    expect(computeH2hInterestFactor(undefined)).toBe(1);
    expect(computeH2hInterestFactor(0)).toBe(1);
  });

  it("clamps valid density ratios to the 0..1 range", () => {
    expect(computeH2hInterestFactor(0.6)).toBe(0.6);
    expect(computeH2hInterestFactor(1.5)).toBe(1);
  });
});

describe("computeImportanceScore", () => {
  it("combines all factors including the v1 follow bonus constant", () => {
    const fixture = makeFixture();
    const context = makeContext({
      standingsByFixtureId: new Map([
        [
          1,
          {
            homeRank: 1,
            awayRank: 4,
            teamCount: 20,
          },
        ],
      ]),
      h2hInterestByFixtureId: new Map([[1, 0.8]]),
    });

    const score = computeImportanceScore(fixture, context);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(computeFollowBonusFactor()).toBe(1);
  });
});
