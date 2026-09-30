import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapFixture } from "@/lib/api-football/adapter";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  reconcileStaleLiveFixtures,
  shouldRevalidateBecauseAbsentFromActiveLiveSet,
} from "@/lib/live/reconcile-stale-live";
import type { Fixture } from "@/types/domain";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

const readLiveFixturesFromDb = vi.fn<() => Promise<Fixture[]>>();
const ingestLiveFixtureTick = vi.fn();
const getFixtureByIdWithRaw = vi.fn();
const ingestFixtureFromRaw = vi.fn();
const finalizeExpiredStaleLiveFixturesInDb = vi.fn();

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isLivePollingEnabled: () => true,
  };
});

vi.mock("@/lib/ingestion/db-read", () => ({
  readLiveFixturesFromDb: () => readLiveFixturesFromDb(),
}));

vi.mock("@/lib/live/ingest-live-tick", () => ({
  ingestLiveFixtureTick: (...args: unknown[]) => ingestLiveFixtureTick(...args),
}));

vi.mock("@/lib/api-football/endpoints/fixtures", () => ({
  getFixtureByIdWithRaw: (...args: unknown[]) => getFixtureByIdWithRaw(...args),
}));

vi.mock("@/lib/ingestion/upsert", () => ({
  ingestFixtureFromRaw: (...args: unknown[]) => ingestFixtureFromRaw(...args),
}));

vi.mock("@/lib/ingestion/throttle", () => ({
  throttleProviderRequest: vi.fn(async () => undefined),
}));

vi.mock("@/lib/live/broadcaster", () => ({
  broadcastMatchUpdate: vi.fn(async () => undefined),
  broadcastLiveFeedUpdate: vi.fn(async () => undefined),
}));

vi.mock("@/lib/live/finalize-expired-stale-live", () => ({
  finalizeExpiredStaleLiveFixturesInDb: () =>
    finalizeExpiredStaleLiveFixturesInDb(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

vi.mock("@/lib/redis/client", () => ({
  getRedis: () => null,
}));

function dbLiveFixture(overrides: Partial<Fixture> = {}): Fixture {
  const now = Date.now();
  return {
    externalId: 1642977,
    league: {
      externalId: 39,
      name: "Premier League",
      type: null,
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
    kickoffAt: new Date(now - 90 * 60 * 1000).toISOString(),
    status: "2H",
    minute: 78,
    score: {
      home: 1,
      away: 0,
      halftimeHome: 1,
      halftimeAway: 0,
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
      lastProviderSyncAt: new Date(now - 30_000).toISOString(),
      periodFirstStartAt: null,
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

function ftRawForProvider(providerId: number): RawApiFootballFixture {
  const sample =
    loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json")
      .response[0]!;
  return {
    ...sample,
    fixture: {
      ...sample.fixture,
      id: providerId,
      status: {
        long: "Match Finished",
        short: "FT",
        elapsed: 90,
        extra: 4,
      },
    },
  };
}

describe("shouldRevalidateBecauseAbsentFromActiveLiveSet", () => {
  it("does not revalidate when the active live set is empty (filtered provider tick)", () => {
    expect(
      shouldRevalidateBecauseAbsentFromActiveLiveSet(1642977, new Set())
    ).toBe(false);
    expect(
      shouldRevalidateBecauseAbsentFromActiveLiveSet(1642977, undefined)
    ).toBe(false);
  });

  it("revalidates when provider reported other live fixtures but not this one", () => {
    expect(
      shouldRevalidateBecauseAbsentFromActiveLiveSet(1642977, new Set([999999]))
    ).toBe(true);
    expect(
      shouldRevalidateBecauseAbsentFromActiveLiveSet(
        1642977,
        new Set([1642977])
      )
    ).toBe(false);
  });
});

describe("reconcileStaleLiveFixtures", () => {
  beforeEach(() => {
    readLiveFixturesFromDb.mockReset();
    ingestLiveFixtureTick.mockReset();
    getFixtureByIdWithRaw.mockReset();
    ingestFixtureFromRaw.mockReset();
    finalizeExpiredStaleLiveFixturesInDb.mockReset();

    finalizeExpiredStaleLiveFixturesInDb.mockResolvedValue({ finalized: 0 });
    ingestLiveFixtureTick.mockResolvedValue({
      ok: false,
      fixtureProviderId: 1642977,
      reason: "no_change",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("finalizes a DB-live fixture when provider fixture-by-id returns FT (scenario A)", async () => {
    const providerId = 1642977;
    const liveRow = dbLiveFixture({ externalId: providerId });
    const raw = ftRawForProvider(providerId);
    const finishedDomain = mapFixture(raw);

    readLiveFixturesFromDb
      .mockResolvedValueOnce([liveRow])
      .mockResolvedValueOnce([finishedDomain])
      .mockResolvedValueOnce([finishedDomain]);

    getFixtureByIdWithRaw.mockResolvedValue({
      raw,
      domain: finishedDomain,
    });

    ingestFixtureFromRaw.mockImplementation(async (_client, ingestedRaw) => {
      const domain = mapFixture(ingestedRaw);
      return { domain };
    });

    const result = await reconcileStaleLiveFixtures({
      activeLiveProviderIds: [999999],
      source: "test-scenario-a",
    });

    expect(result.ok).toBe(true);
    expect(result.stats.candidates).toBe(1);
    expect(result.stats.revalidated).toBe(1);
    expect(result.stats.finalized).toBe(1);
    expect(result.stats.errors).toBe(0);
    expect(getFixtureByIdWithRaw).toHaveBeenCalledWith(providerId);
    expect(ingestFixtureFromRaw).toHaveBeenCalledTimes(1);
    const ingestedRaw = ingestFixtureFromRaw.mock
      .calls[0]![1] as RawApiFootballFixture;
    expect(ingestedRaw.fixture.status.short).toBe("FT");
    const upsertResult = await ingestFixtureFromRaw.mock.results[0]!.value;
    expect(upsertResult.domain.status).toBe("FT");
  });
});
