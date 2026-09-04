import { describe, expect, it } from "vitest";

import {
  buildTeamPrimaryContext,
  formatTeamStandingLabel,
  resolvePrimaryLeagueFromFixtures,
  resolveSeasonYear,
} from "@/lib/teams/resolve-primary-league";
import type { Fixture, Season, StandingsGroup } from "@/types/domain";

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
      externalId: 33,
      name: "Manchester United",
      code: "MUN",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 34,
      name: "Newcastle",
      code: "NEW",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-02T15:00:00.000Z",
    status: "FT",
    minute: null,
    score: {
      home: 1,
      away: 0,
      halftimeHome: null,
      halftimeAway: null,
      fulltimeHome: 1,
      fulltimeAway: 0,
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

describe("resolvePrimaryLeagueFromFixtures", () => {
  it("returns null for empty fixtures", () => {
    expect(resolvePrimaryLeagueFromFixtures([])).toBeNull();
  });

  it("picks the league with the most fixtures", () => {
    const fixtures = [
      makeFixture(),
      makeFixture({ externalId: 2 }),
      makeFixture({
        externalId: 3,
        league: {
          externalId: 2,
          name: "Champions League",
          type: "Cup",
          country: null,
          logoUrl: null,
        },
      }),
    ];

    const result = resolvePrimaryLeagueFromFixtures(fixtures);

    expect(result?.leagueExternalId).toBe(39);
    expect(result?.leagueName).toBe("Premier League");
    expect(result?.seasonYear).toBe(2025);
  });

  it("breaks ties by lower league id", () => {
    const fixtures = [
      makeFixture({
        league: {
          externalId: 140,
          name: "La Liga",
          type: "League",
          country: null,
          logoUrl: null,
        },
      }),
      makeFixture({
        externalId: 2,
        league: {
          externalId: 39,
          name: "Premier League",
          type: "League",
          country: null,
          logoUrl: null,
        },
      }),
    ];

    const result = resolvePrimaryLeagueFromFixtures(fixtures);

    expect(result?.leagueExternalId).toBe(39);
  });

  it("prefers league competitions over cups when both are present", () => {
    const fixtures = [
      makeFixture(),
      makeFixture({ externalId: 2 }),
      makeFixture({
        externalId: 3,
        league: {
          externalId: 2,
          name: "Champions League",
          type: "Cup",
          country: null,
          logoUrl: null,
        },
      }),
      makeFixture({
        externalId: 4,
        league: {
          externalId: 2,
          name: "Champions League",
          type: "Cup",
          country: null,
          logoUrl: null,
        },
      }),
      makeFixture({
        externalId: 5,
        league: {
          externalId: 2,
          name: "Champions League",
          type: "Cup",
          country: null,
          logoUrl: null,
        },
      }),
    ];

    const result = resolvePrimaryLeagueFromFixtures(fixtures);

    expect(result?.leagueExternalId).toBe(39);
  });
});

describe("resolveSeasonYear", () => {
  it("falls back to current season when fixtures omit season year", () => {
    const primary = {
      leagueExternalId: 39,
      leagueName: "Premier League",
      leagueLogoUrl: null,
      seasonYear: null,
    };
    const seasons: Season[] = [
      {
        leagueExternalId: 39,
        year: 2024,
        startDate: null,
        endDate: null,
        isCurrent: false,
      },
      {
        leagueExternalId: 39,
        year: 2025,
        startDate: null,
        endDate: null,
        isCurrent: true,
      },
    ];

    expect(resolveSeasonYear(primary, seasons)).toBe(2025);
  });
});

describe("buildTeamPrimaryContext", () => {
  it("attaches standing row for the team", () => {
    const fixtures = [makeFixture()];
    const standings: StandingsGroup[] = [
      {
        leagueExternalId: 39,
        seasonYear: 2025,
        groupName: "Overall",
        rows: [
          {
            rank: 3,
            team: {
              externalId: 33,
              name: "Manchester United",
              code: "MUN",
              logoUrl: null,
              isNational: false,
            },
            points: 10,
            goalsDiff: 4,
            groupName: null,
            form: "WWD",
            played: 5,
            win: 3,
            draw: 1,
            lose: 1,
            goalsFor: 8,
            goalsAgainst: 4,
          },
        ],
      },
    ];

    const context = buildTeamPrimaryContext(fixtures, standings, 33);

    expect(context?.standingRow?.rank).toBe(3);
    expect(formatTeamStandingLabel(context!)).toBe("3rd in Premier League");
  });
});
