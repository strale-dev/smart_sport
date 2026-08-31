import { afterEach, describe, expect, it, vi } from "vitest";

import * as dbRead from "@/lib/ingestion/db-read";
import * as fixtureEndpoints from "@/lib/api-football/endpoints/fixtures";
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
});
