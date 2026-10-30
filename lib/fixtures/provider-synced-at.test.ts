import { describe, expect, it } from "vitest";

import {
  FIXTURE_SYNC_STALE_AFTER_MS,
  resolveProviderSyncedAt,
  windowIncludesToday,
  type FixtureSyncRunEvidence,
  type ResolveProviderSyncedAtInput,
} from "@/lib/fixtures/provider-synced-at";

const NOW = new Date("2026-10-30T12:00:00.000Z");
const TODAY = "2026-10-30";

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function input(
  overrides: Partial<ResolveProviderSyncedAtInput> = {}
): ResolveProviderSyncedAtInput {
  return {
    now: NOW,
    todayDateKey: TODAY,
    hasLiveFixture: false,
    windowFromDate: TODAY,
    windowToDateExclusive: "2026-10-31",
    runs: [],
    fixtureLastProviderSyncAt: [],
    leagueLastSyncAt: [],
    envelopeCachedAt: null,
    persistedFixtureCount: 1,
    metaStale: false,
    ...overrides,
  };
}

function run(
  overrides: Partial<FixtureSyncRunEvidence> = {}
): FixtureSyncRunEvidence {
  return {
    jobName: "sync-fixtures-today",
    status: "complete",
    startedAt: minutesAgo(20),
    finishedAt: minutesAgo(10),
    statsDate: TODAY,
    ...overrides,
  };
}

describe("windowIncludesToday", () => {
  it("is false for a past date window", () => {
    expect(windowIncludesToday(TODAY, "2026-10-01", "2026-10-02")).toBe(false);
  });

  it("is false for a future date window", () => {
    expect(windowIncludesToday(TODAY, "2026-11-15", "2026-11-16")).toBe(false);
  });

  it("is true when the window covers today", () => {
    expect(windowIncludesToday(TODAY, "2026-10-29", "2026-10-31")).toBe(true);
  });
});

describe("resolveProviderSyncedAt", () => {
  it("prefers a complete fixture sync run over a newer fixture row", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        runs: [run({ finishedAt: minutesAgo(40) })],
        fixtureLastProviderSyncAt: [minutesAgo(5)],
      })
    );

    expect(anchor.providerSyncSource).toBe("ingestion_run");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(40));
  });

  it("uses the newest fixture sync when no complete run applies", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        fixtureLastProviderSyncAt: [minutesAgo(50), minutesAgo(12)],
        leagueLastSyncAt: [minutesAgo(1)],
      })
    );

    expect(anchor.providerSyncSource).toBe("fixture_row");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(12));
  });

  it("uses league last_sync_at before the cache envelope", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        leagueLastSyncAt: [minutesAgo(90), minutesAgo(15)],
        envelopeCachedAt: minutesAgo(1),
      })
    );

    expect(anchor.providerSyncSource).toBe("league_season");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(15));
  });

  it("falls back to the cache envelope and does not treat it as persisted data", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        persistedFixtureCount: 0,
        envelopeCachedAt: minutesAgo(1),
      })
    );

    expect(anchor.providerSyncSource).toBe("cache_envelope");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(1));
    expect(anchor.providerUnavailable).toBe(true);
  });

  it("ignores a complete run whose stats.date is outside the window", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        runs: [run({ statsDate: "2026-01-01", finishedAt: minutesAgo(5) })],
        fixtureLastProviderSyncAt: [minutesAgo(12)],
      })
    );

    expect(anchor.providerSyncSource).toBe("fixture_row");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(12));
  });

  it("keeps a complete run that has no stats.date", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        runs: [run({ statsDate: null, finishedAt: minutesAgo(25) })],
        fixtureLastProviderSyncAt: [minutesAgo(5)],
      })
    );

    expect(anchor.providerSyncSource).toBe("ingestion_run");
    expect(anchor.providerSyncedAt).toBe(minutesAgo(25));
  });

  it("ignores sync runs for other jobs", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        runs: [
          run({
            jobName: "sync-fixtures-future",
            finishedAt: minutesAgo(5),
          }),
        ],
        fixtureLastProviderSyncAt: [minutesAgo(12)],
      })
    );

    expect(anchor.providerSyncSource).toBe("fixture_row");
  });

  it("does not mark an empty window unavailable after a complete run", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        persistedFixtureCount: 0,
        runs: [run({ finishedAt: minutesAgo(5) })],
      })
    );

    expect(anchor.providerUnavailable).toBe(false);
    expect(anchor.freshnessStale).toBe(false);
  });

  it("marks an empty window unavailable when the newest run failed", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        persistedFixtureCount: 0,
        leagueLastSyncAt: [minutesAgo(10)],
        runs: [
          run({
            status: "failed",
            startedAt: minutesAgo(3),
            finishedAt: minutesAgo(2),
          }),
        ],
      })
    );

    expect(anchor.providerUnavailable).toBe(true);
    expect(anchor.freshnessStale).toBe(true);
  });

  it("marks today's window stale once the sync is at least 30 minutes old", () => {
    const staleAgeMs = FIXTURE_SYNC_STALE_AFTER_MS + 60_000;
    const anchor = resolveProviderSyncedAt(
      input({
        fixtureLastProviderSyncAt: [
          new Date(NOW.getTime() - staleAgeMs).toISOString(),
        ],
      })
    );

    expect(anchor.freshnessStale).toBe(true);
  });

  it("keeps today's window fresh inside the 30 minute threshold", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        fixtureLastProviderSyncAt: [minutesAgo(10)],
      })
    );

    expect(anchor.freshnessStale).toBe(false);
  });

  it("does not apply the 30 minute threshold to a past date", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        todayDateKey: TODAY,
        windowFromDate: "2026-10-01",
        windowToDateExclusive: "2026-10-02",
        hasLiveFixture: false,
        fixtureLastProviderSyncAt: [minutesAgo(180)],
      })
    );

    expect(windowIncludesToday(TODAY, "2026-10-01", "2026-10-02")).toBe(false);
    expect(anchor.freshnessStale).toBe(false);
    expect(anchor.providerSyncSource).toBe("fixture_row");
  });

  it("does not apply the 30 minute threshold to a future date", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        todayDateKey: TODAY,
        windowFromDate: "2026-11-15",
        windowToDateExclusive: "2026-11-16",
        hasLiveFixture: false,
        fixtureLastProviderSyncAt: [minutesAgo(180)],
      })
    );

    expect(windowIncludesToday(TODAY, "2026-11-15", "2026-11-16")).toBe(false);
    expect(anchor.freshnessStale).toBe(false);
  });

  it("still applies the 30 minute threshold when a past window has a live match", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        windowFromDate: "2026-10-01",
        windowToDateExclusive: "2026-10-02",
        hasLiveFixture: true,
        fixtureLastProviderSyncAt: [minutesAgo(45)],
      })
    );

    expect(anchor.freshnessStale).toBe(true);
  });

  it("stays stale on a past date when meta.stale is set", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        windowFromDate: "2026-10-01",
        windowToDateExclusive: "2026-10-02",
        metaStale: true,
        fixtureLastProviderSyncAt: [minutesAgo(5)],
      })
    );

    expect(anchor.freshnessStale).toBe(true);
  });

  it("stays stale on a future date when the newest run failed", () => {
    const anchor = resolveProviderSyncedAt(
      input({
        windowFromDate: "2026-11-15",
        windowToDateExclusive: "2026-11-16",
        persistedFixtureCount: 2,
        fixtureLastProviderSyncAt: [minutesAgo(5)],
        runs: [
          run({
            status: "failed",
            statsDate: "2026-11-15",
            startedAt: minutesAgo(4),
            finishedAt: minutesAgo(3),
          }),
        ],
      })
    );

    expect(anchor.freshnessStale).toBe(true);
    expect(anchor.providerUnavailable).toBe(false);
  });
});
