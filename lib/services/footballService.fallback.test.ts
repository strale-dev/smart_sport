import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapFixture } from "@/lib/api-football/adapter";
import {
  ApiFootballError,
  ApiFootballQuotaError,
} from "@/lib/api-football/errors";
import * as fixtureEndpoints from "@/lib/api-football/endpoints/fixtures";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import * as dbRead from "@/lib/ingestion/db-read";
import { resetCacheForTests } from "@/lib/redis/cache";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";
import * as footballService from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

const sampleFixture = mapFixture(
  loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json")
    .response[0]!
);

function dbFixture(overrides: Partial<Fixture> = {}): Fixture {
  return { ...sampleFixture, ...overrides };
}

describe("footballService provider fallback (1.B.2, 1.B.3, 1.B.7)", () => {
  beforeEach(() => {
    resetCacheForTests();
    resetMemoryLocksForTests();
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

  it("1.B.2 — provider failure falls back to Postgres with stale meta", async () => {
    vi.spyOn(fixtureEndpoints, "listFixturesByDate").mockRejectedValue(
      new ApiFootballError("API-Football provider returned errors", {
        path: "/fixtures",
        statusCode: 503,
      })
    );
    const fromDb = [dbFixture({ externalId: 9001 })];
    const dbSpy = vi
      .spyOn(dbRead, "readFixturesForDateFromDb")
      .mockResolvedValue(fromDb);

    const result = await footballService.getMatchesForDate("2026-08-30");

    expect(result.data).toEqual(fromDb);
    expect(result.meta.stale).toBe(true);
    expect(result.meta.cached).toBe(false);
    expect(dbSpy).toHaveBeenCalledOnce();
  });

  it("1.B.3 — ApiFootballQuotaError falls back to Postgres when cache is empty", async () => {
    vi.spyOn(fixtureEndpoints, "listFixturesByDate").mockRejectedValue(
      new ApiFootballQuotaError("API-Football daily quota is low")
    );
    const fromDb = [dbFixture({ externalId: 9002 })];
    const dbSpy = vi
      .spyOn(dbRead, "readFixturesForDateFromDb")
      .mockResolvedValue(fromDb);

    const result = await footballService.getMatchesForDate("2026-08-31");

    expect(result.data).toEqual(fromDb);
    expect(result.meta.stale).toBe(true);
    expect(dbSpy).toHaveBeenCalledOnce();
  });

  it("1.B.7 — recovers from provider failure once the provider responds again", async () => {
    const listSpy = vi
      .spyOn(fixtureEndpoints, "listFixturesByDate")
      .mockRejectedValueOnce(
        new ApiFootballError("API-Football provider returned errors", {
          path: "/fixtures",
        })
      )
      .mockResolvedValueOnce([sampleFixture]);

    vi.spyOn(dbRead, "readFixturesForDateFromDb").mockResolvedValue([
      dbFixture({ externalId: 9003 }),
    ]);

    const date = "2026-09-01";
    const degraded = await footballService.getMatchesForDate(date);
    expect(degraded.meta.stale).toBe(true);
    expect(degraded.data[0]?.externalId).toBe(9003);

    const recovered = await footballService.getMatchesForDate(date);
    expect(recovered.meta.stale).toBe(false);
    expect(recovered.data).toEqual([sampleFixture]);
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
