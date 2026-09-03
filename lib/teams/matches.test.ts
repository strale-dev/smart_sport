import { describe, expect, it } from "vitest";

import { splitFixturesByStatus } from "@/lib/teams/matches";
import type { Fixture } from "@/types/domain";

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
    kickoffAt: "2026-09-03T15:00:00.000Z",
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

describe("splitFixturesByStatus", () => {
  it("groups live, upcoming, and past fixtures", () => {
    const olderPast = makeFixture({ externalId: 1, status: "FT" });
    const recentPast = makeFixture({ externalId: 2, status: "AET" });
    const live = makeFixture({ externalId: 3, status: "2H" });
    const upcoming = makeFixture({ externalId: 4, status: "NS" });

    const groups = splitFixturesByStatus([
      olderPast,
      recentPast,
      live,
      upcoming,
    ]);

    expect(groups.live.map((fixture) => fixture.externalId)).toEqual([3]);
    expect(groups.upcoming.map((fixture) => fixture.externalId)).toEqual([4]);
    expect(groups.past.map((fixture) => fixture.externalId)).toEqual([2, 1]);
  });
});
