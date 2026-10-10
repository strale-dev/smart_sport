import { beforeEach, describe, expect, it, vi } from "vitest";

const getFixtureIngestContext = vi.fn();
const upsertLineups = vi.fn();
const withFixtureMatchDetailsLock = vi.fn();

vi.mock("@/lib/ingestion/fixture-match-details-lock", () => ({
  withFixtureMatchDetailsLock,
}));

vi.mock("@/lib/ingestion/match-details-upsert", () => ({
  getFixtureIngestContext,
  upsertLineups,
}));

vi.mock("@/lib/ingestion/ingestion-observability", () => ({
  logFixtureIngestUnit: vi.fn(),
}));

vi.mock("@/lib/ingestion/ingest-sidelined", () => ({
  ingestFixtureSidelinedFromProvider: vi.fn(),
}));

vi.mock("@/lib/ingestion/throttle", () => ({
  throttleProviderRequest: vi.fn(),
}));

vi.mock("@/lib/competitions/index", () => ({
  findCompetition: vi.fn(() => ({
    providerId: 39,
    capabilities: { lineups: true },
  })),
}));

vi.mock("@/lib/api-football/endpoints/fixtures", () => ({
  getFixtureLineups: vi.fn(),
}));

vi.mock("@/lib/redis/cache", () => ({
  writeCachedValue: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

describe("ingestLineupsFromProvider", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    upsertLineups.mockResolvedValue(2);
    withFixtureMatchDetailsLock.mockImplementation(async (_id, fn) => ({
      acquired: true,
      value: await fn(),
    }));
  });

  it("classifies empty pre-kickoff lineups as not yet available", async () => {
    getFixtureIngestContext.mockResolvedValue({
      fixtureUuid: "uuid-1",
      providerId: 200,
      status: "NS",
      kickoffAt: "2099-01-01T15:00:00.000Z",
      leagueProviderId: 39,
    });

    const { getFixtureLineups } =
      await import("@/lib/api-football/endpoints/fixtures");
    vi.mocked(getFixtureLineups).mockResolvedValue([]);

    const { ingestLineupsFromProvider } =
      await import("@/lib/ingestion/ingest-lineups");

    const result = await ingestLineupsFromProvider(200, {
      persistFixtureState: false,
    });

    expect(result.availability).toBe("NOT_YET_AVAILABLE");
    expect(result.outcome).toBe("SKIPPED");
    expect(upsertLineups).not.toHaveBeenCalled();
  });

  it("returns retryable failure when fixture write lock is not acquired", async () => {
    getFixtureIngestContext.mockResolvedValue({
      fixtureUuid: "uuid-1",
      providerId: 200,
      status: "NS",
      kickoffAt: "2026-10-07T15:00:00.000Z",
      leagueProviderId: 39,
    });

    const { getFixtureLineups } =
      await import("@/lib/api-football/endpoints/fixtures");
    vi.mocked(getFixtureLineups).mockResolvedValue([
      {
        team: { id: 1, name: "A", logo: null },
        formation: "4-3-3",
        startXI: [],
        substitutes: [],
        coach: null,
        isConfirmed: true,
      },
      {
        team: { id: 2, name: "B", logo: null },
        formation: "4-4-2",
        startXI: [],
        substitutes: [],
        coach: null,
        isConfirmed: true,
      },
    ] as never);

    withFixtureMatchDetailsLock.mockResolvedValue({
      acquired: false,
      reason: "match_details_write_lock_not_acquired",
    });

    const { ingestLineupsFromProvider } =
      await import("@/lib/ingestion/ingest-lineups");

    const result = await ingestLineupsFromProvider(200, {
      persistFixtureState: false,
    });

    expect(result.outcome).toBe("RETRYABLE_FAILURE");
    expect(result.reason).toBe("match_details_write_lock_not_acquired");
    expect(upsertLineups).not.toHaveBeenCalled();
  });
});
