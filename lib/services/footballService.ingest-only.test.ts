import { afterEach, describe, expect, it, vi } from "vitest";

import * as dbRead from "@/lib/ingestion/db-read";
import * as matchDetailsUpsert from "@/lib/ingestion/match-details-upsert";
import * as fixtureEndpoints from "@/lib/api-football/endpoints/fixtures";
import * as playerEndpoints from "@/lib/api-football/endpoints/players";
import { resetCacheForTests } from "@/lib/redis/cache";
import * as footballService from "@/lib/services/footballService";

describe("footballService ingest-only mode", () => {
  const baseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test",
    NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
    NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    NEXT_PUBLIC_SITE_URL: "https://scorence.app",
    NEXT_PUBLIC_APP_ENV: "development",
  };

  afterEach(() => {
    resetCacheForTests();
    vi.restoreAllMocks();
    delete process.env.API_FOOTBALL_INGEST_ONLY;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("reads fixtures from Postgres instead of the provider", async () => {
    Object.assign(process.env, baseEnv);
    process.env.API_FOOTBALL_INGEST_ONLY = "true";

    const dbSpy = vi
      .spyOn(dbRead, "readFixturesForDateFromDb")
      .mockResolvedValue([]);
    const apiSpy = vi.spyOn(fixtureEndpoints, "listFixturesByDate");

    await footballService.getMatchesForDate("2026-08-31");

    expect(dbSpy).toHaveBeenCalledOnce();
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("reads players from Postgres when present", async () => {
    Object.assign(process.env, baseEnv);
    process.env.API_FOOTBALL_INGEST_ONLY = "true";

    const dbSpy = vi
      .spyOn(dbRead, "readPlayerByProviderIdFromDb")
      .mockResolvedValue({
        externalId: 276,
        firstName: null,
        lastName: null,
        fullName: "N. Kanté",
        nationality: null,
        dateOfBirth: null,
        heightCm: null,
        weightKg: null,
        position: "MF",
        preferredFoot: "UNKNOWN",
        photoUrl: null,
        currentTeam: null,
        shirtNumber: 13,
        marketValue: null,
        averageRating: null,
      });
    const apiSpy = vi.spyOn(playerEndpoints, "getPlayerById");

    await footballService.getPlayerById(276);

    expect(dbSpy).toHaveBeenCalledOnce();
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("falls back to the provider when the player is missing from Postgres", async () => {
    Object.assign(process.env, baseEnv);
    process.env.API_FOOTBALL_INGEST_ONLY = "true";

    vi.spyOn(dbRead, "readPlayerByProviderIdFromDb").mockResolvedValue(null);
    vi.spyOn(matchDetailsUpsert, "persistPlayerProfile").mockResolvedValue();
    vi.spyOn(playerEndpoints, "getPlayerProfileById").mockResolvedValue({
      externalId: 276,
      firstName: null,
      lastName: null,
      fullName: "N. Kanté",
      nationality: null,
      dateOfBirth: null,
      heightCm: null,
      weightKg: null,
      position: "MF",
      preferredFoot: "UNKNOWN",
      photoUrl: null,
      currentTeam: null,
      shirtNumber: 13,
      marketValue: null,
      averageRating: null,
    });

    const result = await footballService.getPlayerById(276);

    expect(result.data?.fullName).toBe("N. Kanté");
  });

  it("reads team fixtures from Postgres", async () => {
    Object.assign(process.env, baseEnv);
    process.env.API_FOOTBALL_INGEST_ONLY = "true";

    const teamIdSpy = vi
      .spyOn(dbRead, "readTeamIdByProviderIdFromDb")
      .mockResolvedValue("team-uuid");
    const fixturesSpy = vi
      .spyOn(dbRead, "readFixturesForTeamsInRangeFromDb")
      .mockResolvedValue([]);

    await footballService.getFixturesForTeam(
      33,
      new Date("2026-09-03T12:00:00.000Z")
    );

    expect(teamIdSpy).toHaveBeenCalledWith(33);
    expect(fixturesSpy).toHaveBeenCalledWith(
      ["team-uuid"],
      "2026-08-04T00:00:00.000Z",
      "2027-09-04T00:00:00.000Z"
    );
  });
});
