import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapFixture } from "@/lib/api-football/adapter";
import { ApiFootballError } from "@/lib/api-football/errors";
import * as fixtureEndpoints from "@/lib/api-football/endpoints/fixtures";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import * as dbRead from "@/lib/ingestion/db-read";
import { resetCacheForTests } from "@/lib/redis/cache";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";
import * as footballService from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

const getRedisMock = vi.hoisted(() => vi.fn<() => unknown>(() => null));

vi.mock("@/lib/redis/client", () => ({
  getRedis: () => getRedisMock(),
  resetRedisClientForTests: () => undefined,
  pingRedis: async () => false,
}));

const sampleFixture = mapFixture(
  loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json")
    .response[0]!
);

function providerUnavailableError(): ApiFootballError {
  return new ApiFootballError("API-Football provider returned errors", {
    path: "/fixtures",
    statusCode: 503,
  });
}

function upstashDnsFailure(): TypeError {
  return new TypeError("fetch failed", {
    cause: {
      code: "ENOTFOUND",
      syscall: "getaddrinfo",
      hostname: "dead-instance.upstash.io",
    },
  });
}

function createBrokenRedisClient() {
  return {
    get: vi.fn().mockRejectedValue(upstashDnsFailure()),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  };
}

describe("footballService when Redis is unavailable (1.B.5)", () => {
  beforeEach(() => {
    resetCacheForTests();
    resetMemoryLocksForTests();
    getRedisMock.mockReset();
    process.env.API_FOOTBALL_INGEST_ONLY = "false";
    process.env.NEXT_PUBLIC_APP_ENV = "production";
  });

  afterEach(() => {
    resetCacheForTests();
    resetMemoryLocksForTests();
    vi.restoreAllMocks();
    delete process.env.API_FOOTBALL_INGEST_ONLY;
    delete process.env.NEXT_PUBLIC_APP_ENV;
  });

  it("getRedis() === null — provider failure still falls back to Postgres", async () => {
    getRedisMock.mockReturnValue(null);

    vi.spyOn(fixtureEndpoints, "listFixturesByDate").mockRejectedValue(
      providerUnavailableError()
    );
    const fromDb: Fixture[] = [{ ...sampleFixture, externalId: 9101 }];
    const dbSpy = vi
      .spyOn(dbRead, "readFixturesForDateFromDb")
      .mockResolvedValue(fromDb);

    const result = await footballService.getMatchesForDate("2026-09-02");

    expect(result.data).toEqual(fromDb);
    expect(result.meta.stale).toBe(true);
    expect(dbSpy).toHaveBeenCalledOnce();
  });

  it("Redis get() throws (Upstash DNS) — provider failure still falls back to Postgres", async () => {
    getRedisMock.mockReturnValue(createBrokenRedisClient());

    vi.spyOn(fixtureEndpoints, "listFixturesByDate").mockRejectedValue(
      providerUnavailableError()
    );
    const fromDb: Fixture[] = [{ ...sampleFixture, externalId: 9102 }];
    const dbSpy = vi
      .spyOn(dbRead, "readFixturesForDateFromDb")
      .mockResolvedValue(fromDb);

    const result = await footballService.getMatchesForDate("2026-09-03");

    expect(result.data).toEqual(fromDb);
    expect(result.meta.stale).toBe(true);
    expect(dbSpy).toHaveBeenCalledOnce();
  });
});
