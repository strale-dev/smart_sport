import { beforeEach, describe, expect, it, vi } from "vitest";

const getIngestionConfig = vi.fn();
const ingestLineupsFromProvider = vi.fn();
const fixtureNeedsLineupSync = vi.fn();

const leagueChain = {
  in: vi.fn(),
};

const fixtureChain = {
  in: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
};

const client = {
  from: vi.fn((table: string) => {
    if (table === "leagues") {
      return { select: vi.fn(() => leagueChain) };
    }
    if (table === "fixtures") {
      return { select: vi.fn(() => fixtureChain) };
    }
    throw new Error(`Unexpected table ${table}`);
  }),
};

vi.mock("@/lib/ingestion/config", () => ({
  getIngestionConfig,
}));

vi.mock("@/lib/ingestion/ingest-lineups", () => ({
  ingestLineupsFromProvider,
}));

vi.mock("@/lib/ingestion/match-details-upsert", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/ingestion/match-details-upsert")
    >();
  return {
    ...actual,
    fixtureNeedsLineupSync,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => client),
}));

describe("syncLineups", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    leagueChain.in.mockResolvedValue({
      data: [{ id: "league-1" }],
      error: null,
    });
    fixtureChain.in.mockReturnValue(fixtureChain);
    fixtureChain.gte.mockReturnValue(fixtureChain);
    fixtureChain.lte.mockReturnValue(fixtureChain);
    fixtureChain.order.mockReturnValue(fixtureChain);
    fixtureChain.limit.mockResolvedValue({
      data: [
        {
          id: "fix-1",
          provider_id: 1001,
          kickoff_at: "2026-09-13T15:00:00.000Z",
        },
      ],
      error: null,
    });
  });

  it("skips when lineups sync is disabled", async () => {
    getIngestionConfig.mockReturnValue({
      lineupsSyncEnabled: false,
      leagueProviderIds: [39],
    });

    const { syncLineups } = await import("@/lib/ingestion/sync-lineups");
    const result = await syncLineups();

    expect(result.skipped).toBe(true);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("ingests fixtures that need lineup sync", async () => {
    getIngestionConfig.mockReturnValue({
      lineupsSyncEnabled: true,
      leagueProviderIds: [39],
      lineupsSyncBatch: 30,
    });
    fixtureNeedsLineupSync.mockResolvedValue(true);
    ingestLineupsFromProvider.mockResolvedValue({
      ok: true,
      fixtureProviderId: 1001,
      stats: { lineups: 2, apiRequests: 1 },
    });

    const { syncLineups } = await import("@/lib/ingestion/sync-lineups");
    const result = await syncLineups();

    expect(result.stats).toEqual({
      candidates: 1,
      synced: 1,
      skippedComplete: 0,
      errors: 0,
      apiRequests: 1,
    });
    expect(ingestLineupsFromProvider).toHaveBeenCalledWith(1001);
  });

  it("skips fixtures that already have complete lineups", async () => {
    getIngestionConfig.mockReturnValue({
      lineupsSyncEnabled: true,
      leagueProviderIds: [39],
      lineupsSyncBatch: 30,
    });
    fixtureNeedsLineupSync.mockResolvedValue(false);

    const { syncLineups } = await import("@/lib/ingestion/sync-lineups");
    const result = await syncLineups();

    expect(result.stats?.skippedComplete).toBe(1);
    expect(result.stats?.synced).toBe(0);
    expect(ingestLineupsFromProvider).not.toHaveBeenCalled();
  });
});
