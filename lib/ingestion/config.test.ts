import { describe, expect, it } from "vitest";

import {
  buildFixtureDateWindow,
  getIngestionConfig,
  INGESTION_LEAGUE_PROVIDER_IDS,
  isLeagueInAllowlist,
  isTodayOrTomorrowUtc,
} from "@/lib/ingestion/config";

const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
  NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
  NEXT_PUBLIC_SITE_URL: "https://scorence.app",
};

describe("ingestion config", () => {
  it("uses a reduced fixture window in development", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
    });

    expect(config.fixtureWindowDays).toBe(1);
    expect(
      buildFixtureDateWindow(new Date("2026-08-31T12:00:00.000Z"), 1)
    ).toEqual(["2026-08-30", "2026-08-31", "2026-09-01"]);
  });

  it("uses the production fixture window when app env is production", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "production",
    });

    expect(config.fixtureWindowDays).toBe(7);
    expect(config.lineupsSyncEnabled).toBe(true);
  });

  it("filters fixtures to the configured league allowlist", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
    });
    expect(isLeagueInAllowlist(39, config)).toBe(true);
    expect(isLeagueInAllowlist(999, config)).toBe(false);
  });

  it("always refreshes today and tomorrow in UTC", () => {
    const anchor = new Date("2026-08-31T12:00:00.000Z");
    expect(isTodayOrTomorrowUtc("2026-08-31", anchor)).toBe(true);
    expect(isTodayOrTomorrowUtc("2026-09-01", anchor)).toBe(true);
    expect(isTodayOrTomorrowUtc("2026-08-30", anchor)).toBe(false);
  });
});
