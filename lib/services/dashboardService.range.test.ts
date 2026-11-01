import { beforeEach, describe, expect, it, vi } from "vitest";

const getMatchesInRange = vi.fn();

vi.mock("@/lib/services/footballService", () => ({
  getMatchesInRange: (...args: unknown[]) => getMatchesInRange(...args),
  listLiveFixtures: vi.fn(async () => ({ data: [], meta: { cached: false } })),
}));

vi.mock("@/lib/ingestion/db-read", () => ({
  readLeaguePrestigeMap: vi.fn(async () => new Map()),
  readStandingsRanksForFixtures: vi.fn(async () => new Map()),
  readH2hInterestForFixtures: vi.fn(async () => new Map()),
  readRecentPredictionChanges: vi.fn(async () => []),
  readDashboardFollowPoolIdsForUser: vi.fn(async () => ({
    followedTeamProviderIds: new Set<number>(),
    followedLeagueProviderIds: new Set<number>(),
    favoriteFixtureProviderIds: new Set<number>(),
  })),
}));

import { getDashboardData } from "@/lib/services/dashboardService";

describe("getDashboardData range loading", () => {
  beforeEach(() => {
    getMatchesInRange.mockReset();
    getMatchesInRange.mockResolvedValue({
      data: [],
      meta: { cached: false },
    });
  });

  it("loads fixtures with a single getMatchesInRange call", async () => {
    await getDashboardData({
      now: new Date("2026-11-02T12:00:00.000Z"),
      userId: null,
    });

    expect(getMatchesInRange).toHaveBeenCalledTimes(1);
    const [from, toExclusive] = getMatchesInRange.mock.calls[0] as [
      string,
      string,
    ];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toExclusive).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(from < toExclusive).toBe(true);
  });
});
