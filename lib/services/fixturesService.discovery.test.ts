import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Fixture } from "@/types/domain";

const getMatchesInRange = vi.fn();
const finalizeExpiredStaleLiveFixturesInDb = vi.fn();
const readFixtureLeaguePresenceInRangeFromDb = vi.fn();

vi.mock("@/lib/live/finalize-expired-stale-live", () => ({
  finalizeExpiredStaleLiveFixturesInDb,
}));

vi.mock("@/lib/services/footballService", () => ({
  getMatchesInRange,
}));

vi.mock("@/lib/ingestion/db-read", () => ({
  readFixtureLeaguePresenceInRangeFromDb,
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

  it("uses a slim league-presence read for tabs instead of an unscoped fixture range", async () => {
    const pl = fixtureForLeague(39, 1001);
    const emptyMeta = {
      cached: false,
      stale: false,
      cachedAt: null,
    };

    getMatchesInRange.mockResolvedValueOnce({ data: [pl], meta: emptyMeta });
    readFixtureLeaguePresenceInRangeFromDb.mockResolvedValueOnce({
      activeLeagueIds: [39, 140],
      liveLeagueIds: [140],
    });

    const { getFixturesData } = await import("@/lib/services/fixturesService");
    const now = new Date("2026-10-04T12:00:00.000Z");
    const data = await getFixturesData({ league: 39 }, "UTC", now);

    expect(getMatchesInRange).toHaveBeenCalledTimes(1);
    expect(getMatchesInRange.mock.calls[0]?.[2]).toBe(39);
    expect(readFixtureLeaguePresenceInRangeFromDb).toHaveBeenCalledTimes(1);
    expect(data.activeLeagueIds).toEqual(expect.arrayContaining([39, 140]));
    expect(data.liveLeagueIds).toEqual([140]);
    expect(
      data.upcomingDayGroups.flatMap((group) => group.fixtures ?? [])
    ).toHaveLength(1);
    expect(finalizeExpiredStaleLiveFixturesInDb).not.toHaveBeenCalled();
  });

  it("does not finalize stale live fixtures on list read", async () => {
    const emptyMeta = {
      cached: false,
      stale: false,
      cachedAt: null,
    };

    getMatchesInRange.mockResolvedValue({ data: [], meta: emptyMeta });

    const { getFixturesData } = await import("@/lib/services/fixturesService");
    const now = new Date("2026-10-04T12:00:00.000Z");
    await getFixturesData({}, "UTC", now);

    expect(finalizeExpiredStaleLiveFixturesInDb).not.toHaveBeenCalled();
  });
});
