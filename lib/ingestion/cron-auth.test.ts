import { describe, expect, it } from "vitest";

import { verifyCronRequest } from "@/lib/ingestion/cron-auth";

const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
  NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
  NEXT_PUBLIC_SITE_URL: "https://scorence.app",
};

describe("verifyCronRequest", () => {
  it("allows development requests when CRON_SECRET is missing", () => {
    const result = verifyCronRequest(null, {
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects requests when CRON_SECRET is configured but header is missing", () => {
    const result = verifyCronRequest(null, {
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "development",
      CRON_SECRET: "cron_test_secret",
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Unauthorized cron request.",
    });
  });

  it("accepts a valid bearer token", () => {
    const result = verifyCronRequest("Bearer cron_test_secret", {
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "production",
      CRON_SECRET: "cron_test_secret",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts bearer with alternate casing and surrounding whitespace", () => {
    const result = verifyCronRequest("  bearer cron_test_secret  ", {
      ...baseEnv,
      NEXT_PUBLIC_APP_ENV: "production",
      CRON_SECRET: "cron_test_secret",
    });

    expect(result.ok).toBe(true);
  });
});
