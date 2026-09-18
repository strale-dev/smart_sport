import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mapFixture } from "@/lib/api-football/adapter";
import { ApiFootballError } from "@/lib/api-football/errors";
import * as fixtureEndpoints from "@/lib/api-football/endpoints/fixtures";
import * as teamEndpoints from "@/lib/api-football/endpoints/teams";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import * as dbRead from "@/lib/ingestion/db-read";
import { resetCacheForTests } from "@/lib/redis/cache";
import { providerFixturesDateKey } from "@/lib/redis/keys";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";
import * as footballService from "@/lib/services/footballService";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

const sampleFixture = mapFixture(
  loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json")
    .response[0]!
);

describe("footballService", () => {
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
  });

  it("caches getMatchesForDate responses", async () => {
    const listSpy = vi
      .spyOn(fixtureEndpoints, "listFixturesByDate")
      .mockResolvedValue([sampleFixture]);

    const first = await footballService.getMatchesForDate("2026-08-30");
    const second = await footballService.getMatchesForDate("2026-08-30");

    expect(first.data).toHaveLength(1);
    expect(first.meta.cached).toBe(false);
    expect(second.meta.cached).toBe(true);
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(providerFixturesDateKey("2026-08-30")).toBe(
      "provider:fixtures:date:2026-08-30"
    );
  });

  it("caches getFixtureById with dynamic fixture ttl", async () => {
    const getSpy = vi
      .spyOn(fixtureEndpoints, "getFixtureById")
      .mockResolvedValue(sampleFixture);

    const first = await footballService.getFixtureById(1035037);
    const second = await footballService.getFixtureById(1035037);

    expect(first.data?.externalId).toBe(1035037);
    expect(second.meta.cached).toBe(true);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the database when getTeamById provider errors", async () => {
    vi.spyOn(teamEndpoints, "getTeamById").mockRejectedValue(
      new ApiFootballError("API-Football provider returned errors", {
        path: "/teams",
      })
    );
    const dbSpy = vi
      .spyOn(dbRead, "readTeamByProviderIdFromDb")
      .mockResolvedValue({
        externalId: 33,
        name: "Manchester United",
        code: "MUN",
        country: null,
        founded: 1878,
        isNational: false,
        logoUrl: null,
        venue: null,
      });

    const result = await footballService.getTeamById(33);

    expect(result.data?.name).toBe("Manchester United");
    expect(result.meta.stale).toBe(true);
    expect(dbSpy).toHaveBeenCalledOnce();
  });

  it("falls back to the database when the live provider errors", async () => {
    vi.spyOn(fixtureEndpoints, "listLiveFixtures").mockRejectedValue(
      new ApiFootballError("API-Football provider returned errors", {
        path: "/fixtures",
      })
    );
    const liveFixture = {
      ...sampleFixture,
      status: "2H" as const,
      kickoffAt: new Date().toISOString(),
      liveClock: {
        ...sampleFixture.liveClock,
        lastProviderSyncAt: new Date().toISOString(),
        statusExtraMinute: sampleFixture.liveClock?.statusExtraMinute ?? null,
        periodFirstStartAt: sampleFixture.liveClock?.periodFirstStartAt ?? null,
        periodSecondStartAt:
          sampleFixture.liveClock?.periodSecondStartAt ?? null,
      },
    };
    const dbSpy = vi
      .spyOn(dbRead, "readLiveFixturesFromDb")
      .mockResolvedValue([liveFixture]);

    const result = await footballService.listLiveFixtures();

    expect(result.data).toEqual([liveFixture]);
    expect(result.meta.stale).toBe(true);
    expect(dbSpy).toHaveBeenCalledOnce();
  });
});
