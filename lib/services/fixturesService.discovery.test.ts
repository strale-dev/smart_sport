import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Fixture } from "@/types/domain";

const getMatchesInRange = vi.fn();
const finalizeExpiredStaleLiveFixturesInDb = vi.fn();

vi.mock("@/lib/live/finalize-expired-stale-live", () => ({
  finalizeExpiredStaleLiveFixturesInDb,
}));

vi.mock("@/lib/services/footballService", () => ({
  getMatchesInRange,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

function fixtureForLeague(leagueId: number, externalId: number): Fixture {
  return {
    externalId,
    league: {
      externalId: leagueId,
      name: `League ${leagueId}`,
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 1,
      name: "Home",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 2,
      name: "Away",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-10-05T15:00:00.000Z",
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
    liveClock: {
      statusExtraMinute: null,
      lastProviderSyncAt: null,
      periodFirstStartAt: null,
      periodSecondStartAt: null,
    },
  };
}

describe("getFixturesData league discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finalizeExpiredStaleLiveFixturesInDb.mockResolvedValue(undefined);
  });

  it("uses an unscoped range read for league tabs when filtering by league", async () => {
    const pl = fixtureForLeague(39, 1001);
    const laliga = fixtureForLeague(140, 1002);
    const emptyMeta = {
      cached: false,
      stale: false,
      cachedAt: null,
    };

    getMatchesInRange
      .mockResolvedValueOnce({ data: [pl], meta: emptyMeta })
      .mockResolvedValueOnce({ data: [pl, laliga], meta: emptyMeta });

    const { getFixturesData } = await import("@/lib/services/fixturesService");
    const now = new Date("2026-10-04T12:00:00.000Z");
    const data = await getFixturesData({ league: 39 }, "UTC", now);

    expect(getMatchesInRange).toHaveBeenCalledTimes(2);
    expect(getMatchesInRange.mock.calls[0]?.[2]).toBe(39);
    expect(getMatchesInRange.mock.calls[1]?.[2]).toBeUndefined();
    expect(data.activeLeagueIds).toEqual(expect.arrayContaining([39, 140]));
    expect(
      data.upcomingDayGroups.flatMap((group) => group.fixtures ?? [])
    ).toHaveLength(1);
  });
});
