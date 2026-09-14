import { describe, expect, it } from "vitest";

import { FIXTURES_WINDOW_DAYS } from "@/lib/fixtures/constants";
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
  it("uses the fixtures UI window in development", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
    });

    expect(config.fixtureWindowDays).toBe(FIXTURES_WINDOW_DAYS);
    expect(
      buildFixtureDateWindow(
        new Date("2026-08-31T12:00:00.000Z"),
        FIXTURES_WINDOW_DAYS
      )
    ).toHaveLength(FIXTURES_WINDOW_DAYS * 2 + 1);
  });

  it("uses the production fixture window when app env is production", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "production",
    });

    expect(config.fixtureWindowDays).toBe(7);
    expect(config.lineupsSyncEnabled).toBe(true);
  });

  it("disables lineups sync in development by default", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
    });

    expect(config.lineupsSyncEnabled).toBe(false);
  });

  it("disables lineups sync in production when kill-switch env is false", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "production",
      API_FOOTBALL_LINEUPS_SYNC_ENABLED: "false",
    });

    expect(config.lineupsSyncEnabled).toBe(false);
  });

  it("enables lineups sync in development when override env is set", () => {
    const config = getIngestionConfig({
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
      API_FOOTBALL_LINEUPS_SYNC_ENABLED: "true",
    });

    expect(config.lineupsSyncEnabled).toBe(true);
  });

  it("uses default lineups sync batch and respects LINEUPS_SYNC_BATCH", () => {
    expect(
      getIngestionConfig({ ...baseEnv, NEXT_PUBLIC_APP_ENV: "development" })
        .lineupsSyncBatch
    ).toBe(30);
    expect(
      getIngestionConfig({
        ...baseEnv,
        NEXT_PUBLIC_APP_ENV: "development",
        LINEUPS_SYNC_BATCH: "12",
      }).lineupsSyncBatch
    ).toBe(12);
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
