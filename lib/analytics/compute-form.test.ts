import { describe, expect, it } from "vitest";

import {
  aggregateForm,
  collectFormResults,
  resultForTeam,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";

function makeRow(
  overrides: Partial<TeamFixtureRow> & {
    homeProviderId?: number;
    awayProviderId?: number;
    homeName?: string;
    awayName?: string;
  } = {}
): TeamFixtureRow {
  const {
    homeProviderId = 100,
    awayProviderId = 200,
    homeName = "Home FC",
    awayName = "Away FC",
    ...rest
  } = overrides;

  return {
    provider_id: 1,
    kickoff_at: "2026-09-01T15:00:00.000Z",
    score_home: 2,
    score_away: 1,
    home_team: { provider_id: homeProviderId, name: homeName },
    away_team: { provider_id: awayProviderId, name: awayName },
    league: { provider_id: 39, name: "Premier League" },
    ...rest,
  };
}

describe("resultForTeam", () => {
  it("returns a home win for the home team", () => {
    expect(resultForTeam(makeRow(), 100)).toEqual({
      fixtureExternalId: 1,
      opponentName: "Away FC",
      kickoffAt: "2026-09-01T15:00:00.000Z",
      result: "W",
      goalsFor: 2,
      goalsAgainst: 1,
      isHome: true,
    });
  });

  it("returns a loss for the away team when home wins", () => {
    expect(resultForTeam(makeRow(), 200)).toEqual({
      fixtureExternalId: 1,
      opponentName: "Home FC",
      kickoffAt: "2026-09-01T15:00:00.000Z",
      result: "L",
      goalsFor: 1,
      goalsAgainst: 2,
      isHome: false,
    });
  });

  it("returns a draw when scores are equal", () => {
    expect(
      resultForTeam(makeRow({ score_home: 1, score_away: 1 }), 100)?.result
    ).toBe("D");
  });

  it("returns null when scores are missing", () => {
    expect(
      resultForTeam(makeRow({ score_home: null, score_away: 1 }), 100)
    ).toBeNull();
    expect(
      resultForTeam(makeRow({ score_home: 2, score_away: null }), 100)
    ).toBeNull();
  });

  it("returns null when the team is not in the fixture", () => {
    expect(resultForTeam(makeRow(), 999)).toBeNull();
  });

  it("returns null when team relations are missing", () => {
    expect(
      resultForTeam(makeRow({ home_team: null, away_team: null }), 100)
    ).toBeNull();
  });
});

describe("aggregateForm", () => {
  it("returns zeros and null ppg for an empty result set", () => {
    expect(aggregateForm([], "ALL", 5)).toEqual({
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      ppg: null,
      matches: 5,
      scope: "ALL",
      results: [],
    });
  });

  it("computes ppg as (3*wins + draws) / n", () => {
    const results = [
      {
        fixtureExternalId: 1,
        opponentName: "A",
        kickoffAt: "2026-09-01T15:00:00.000Z",
        result: "W" as const,
        goalsFor: 2,
        goalsAgainst: 0,
        isHome: true,
      },
      {
        fixtureExternalId: 2,
        opponentName: "B",
        kickoffAt: "2026-08-25T15:00:00.000Z",
        result: "D" as const,
        goalsFor: 1,
        goalsAgainst: 1,
        isHome: false,
      },
      {
        fixtureExternalId: 3,
        opponentName: "C",
        kickoffAt: "2026-08-18T15:00:00.000Z",
        result: "L" as const,
        goalsFor: 0,
        goalsAgainst: 2,
        isHome: true,
      },
    ];

    const snapshot = aggregateForm(results, "ALL", 5);

    expect(snapshot.wins).toBe(1);
    expect(snapshot.draws).toBe(1);
    expect(snapshot.losses).toBe(1);
    expect(snapshot.goalsFor).toBe(3);
    expect(snapshot.goalsAgainst).toBe(3);
    expect(snapshot.cleanSheets).toBe(1);
    expect(snapshot.ppg).toBe(1.33);
  });
});

describe("collectFormResults", () => {
  it("skips invalid rows and stops at the requested limit", () => {
    const rows = [
      makeRow({ provider_id: 1, score_home: null, score_away: 1 }),
      makeRow({ provider_id: 2, score_home: 3, score_away: 0 }),
      makeRow({ provider_id: 3, score_home: 1, score_away: 1 }),
      makeRow({ provider_id: 4, score_home: 0, score_away: 2 }),
    ];

    const results = collectFormResults(rows, 100, 2);

    expect(results).toHaveLength(2);
    expect(results.map((entry) => entry.fixtureExternalId)).toEqual([2, 3]);
  });
});
