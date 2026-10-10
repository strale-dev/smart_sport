import { beforeEach, describe, expect, it, vi } from "vitest";

const countCompleted = vi.fn();
const getTeamUuid = vi.fn();
const listBySeason = vi.fn();
const refreshSync = vi.fn();
const upsertSync = vi.fn();
const throttle = vi.fn();

vi.mock("@/lib/analytics/team-history-query", () => ({
  countCompletedTeamFixturesByProviderId: (...args: unknown[]) =>
    countCompleted(...args),
  getTeamUuidByProviderId: (...args: unknown[]) => getTeamUuid(...args),
  TEAM_HISTORY_MIN_MATCHES: 30,
  TEAM_HISTORY_TARGET_MATCHES: 100,
  TERMINAL_FIXTURE_STATUSES: ["FT", "AET", "PEN"],
}));

vi.mock("@/lib/api-football/endpoints/fixtures", () => ({
  listFixturesByTeamSeasonRaw: (...args: unknown[]) => listBySeason(...args),
}));

vi.mock("@/lib/ingestion/ingestion-team-sync-state", () => ({
  refreshTeamSyncStateFromDb: (...args: unknown[]) => refreshSync(...args),
  upsertTeamSyncState: (...args: unknown[]) => upsertSync(...args),
}));

vi.mock("@/lib/ingestion/throttle", () => ({
  throttleProviderRequest: (...args: unknown[]) => throttle(...args),
}));

vi.mock("@/lib/ingestion/upsert", () => ({
  ingestFixtureFromRaw: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        or: () => ({
          limit: () =>
            Promise.resolve({
              data: [{ season: { year: 2025 } }],
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

describe("repairTeamHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeamUuid.mockResolvedValue("team-uuid");
    refreshSync.mockResolvedValue(undefined);
    upsertSync.mockResolvedValue(undefined);
    throttle.mockResolvedValue(undefined);
  });

  it("skips provider calls when team already has 30+ completed matches", async () => {
    countCompleted.mockResolvedValue(45);

    const { repairTeamHistory } =
      await import("@/lib/ingestion/repair-team-history");
    const result = await repairTeamHistory(42);

    expect(result.skipped).toBe(true);
    expect(result.apiRequests).toBe(0);
    expect(listBySeason).not.toHaveBeenCalled();
    expect(refreshSync).toHaveBeenCalled();
  });

  it("walks seasons until target count is reached", async () => {
    countCompleted
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(35);

    listBySeason.mockImplementation(async (_teamId: number, season: number) => {
      if (season === 2026) {
        return [
          {
            fixture: {
              id: 1,
              status: { short: "FT" },
            },
          },
        ];
      }
      return [];
    });

    const { repairTeamHistory } =
      await import("@/lib/ingestion/repair-team-history");
    const result = await repairTeamHistory(42, { targetCount: 30 });

    expect(result.skipped).toBe(false);
    expect(result.apiRequests).toBeGreaterThan(0);
    expect(result.finishedCountAfter).toBe(35);
  });
});
