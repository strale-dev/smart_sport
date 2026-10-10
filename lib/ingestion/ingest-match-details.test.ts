import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiFootballRateLimitError } from "@/lib/api-football/errors";

const getFixtureIngestContext = vi.fn();
const persistMatchIngestionState = vi.fn();
const upsertFixtureEvents = vi.fn();
const upsertFixtureStatistics = vi.fn();
const upsertPlayerMatchPerformances = vi.fn();
const ingestLineupsFromProvider = vi.fn();
const withFixtureMatchDetailsLock = vi.fn();

vi.mock("@/lib/ingestion/match-details-upsert", () => ({
  getFixtureIngestContext,
  upsertFixtureEvents,
  upsertFixtureStatistics,
  upsertPlayerMatchPerformances,
}));

vi.mock("@/lib/ingestion/ingestion-result", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/ingestion/ingestion-result")>();
  return {
    ...actual,
    persistMatchIngestionState,
  };
});

vi.mock("@/lib/ingestion/ingest-lineups", () => ({
  ingestLineupsFromProvider,
}));

vi.mock("@/lib/ingestion/fixture-match-details-lock", () => ({
  withFixtureMatchDetailsLock,
}));

vi.mock("@/lib/ingestion/throttle", () => ({
  throttleProviderRequest: vi.fn(),
}));

vi.mock("@/lib/competitions/index", () => ({
  findCompetition: vi.fn(() => ({
    providerId: 39,
    capabilities: {
      fixtureEvents: true,
      fixtureStatistics: true,
      lineups: true,
      playerPerformances: true,
    },
  })),
}));

vi.mock("@/lib/api-football/endpoints/fixtures", () => ({
  getFixtureEvents: vi.fn(),
  getFixtureStatistics: vi.fn(),
  getFixturePlayers: vi.fn(),
}));

vi.mock("@/lib/redis/cache", () => ({
  writeCachedValue: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

describe("ingestMatchDetailsFromProvider", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    persistMatchIngestionState.mockResolvedValue(undefined);
    withFixtureMatchDetailsLock.mockImplementation(async (_id, fn) => ({
      acquired: true,
      value: await fn(),
    }));
    upsertFixtureEvents.mockResolvedValue(1);
    upsertFixtureStatistics.mockResolvedValue({
      upserted: 2,
      skippedMissingTeam: 0,
    });
    upsertPlayerMatchPerformances.mockResolvedValue(5);
    ingestLineupsFromProvider.mockResolvedValue({
      ok: true,
      outcome: "SKIPPED",
      stats: { lineups: 0, apiRequests: 0 },
    });
  });

  it("returns SKIPPED for cancelled fixtures", async () => {
    getFixtureIngestContext.mockResolvedValue({
      fixtureUuid: "uuid-0",
      providerId: 99,
      status: "CANC",
      kickoffAt: "2026-10-10T15:00:00.000Z",
      leagueProviderId: 39,
    });

    const { ingestMatchDetailsFromProvider } =
      await import("@/lib/ingestion/ingest-match-details");
    const result = await ingestMatchDetailsFromProvider(99);
    expect(result.outcome).toBe("SKIPPED");
    expect(result.reason).toBe("fixture_status_canc");
  });

  it("returns SKIPPED for postponed fixtures without provider calls", async () => {
    getFixtureIngestContext.mockResolvedValue({
      fixtureUuid: "uuid-1",
      providerId: 100,
      status: "PST",
      kickoffAt: "2026-10-10T15:00:00.000Z",
      leagueProviderId: 39,
    });

    const { ingestMatchDetailsFromProvider } =
      await import("@/lib/ingestion/ingest-match-details");
    const { getFixtureEvents, getFixtureStatistics } =
      await import("@/lib/api-football/endpoints/fixtures");

    const result = await ingestMatchDetailsFromProvider(100);

    expect(result.outcome).toBe("SKIPPED");
    expect(result.reason).toBe("fixture_status_pst");
    expect(getFixtureEvents).not.toHaveBeenCalled();
    expect(getFixtureStatistics).not.toHaveBeenCalled();
    expect(persistMatchIngestionState).toHaveBeenCalled();
  });

  it("returns PARTIAL when statistics fetch fails retryably but events succeed", async () => {
    getFixtureIngestContext.mockResolvedValue({
      fixtureUuid: "uuid-2",
      providerId: 101,
      status: "FT",
      kickoffAt: "2026-10-01T15:00:00.000Z",
      leagueProviderId: 39,
    });

    const { getFixtureEvents, getFixtureStatistics, getFixturePlayers } =
      await import("@/lib/api-football/endpoints/fixtures");
    vi.mocked(getFixtureEvents).mockResolvedValue([
      {
        externalEventId: "101:1:0:Goal:1:2",
        minute: 1,
        extraMinute: null,
        teamExternalId: 1,
        playerExternalId: 2,
        assistPlayerExternalId: null,
        playerName: "A",
        assistPlayerName: null,
        type: "Goal",
        detail: null,
        comments: null,
      },
    ]);
    vi.mocked(getFixtureStatistics).mockRejectedValue(
      new ApiFootballRateLimitError("API-Football rate limit", {
        path: "/fixtures/statistics",
      })
    );
    vi.mocked(getFixturePlayers).mockResolvedValue([]);

    const { ingestMatchDetailsFromProvider } =
      await import("@/lib/ingestion/ingest-match-details");

    const result = await ingestMatchDetailsFromProvider(101, {
      skipLineups: true,
    });

    expect(result.outcome).toBe("PARTIAL");
    expect(result.stats.events).toBe(1);
  });
});
