import { describe, expect, it } from "vitest";

import {
  parsePublicEnv,
  parseServerEnv,
  publicEnvSchema,
  serverEnvSchema,
} from "./env";

const validPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test_publishable_key",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test_key",
  NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
  NEXT_PUBLIC_SITE_URL: "https://scorence.app",
  NEXT_PUBLIC_APP_ENV: "development",
} as const;

const validServerEnv = {
  ...validPublicEnv,
  SUPABASE_SERVICE_ROLE_KEY: "service_role_test_key",
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM: "Scorence <hello@scorence.app>",
  SENTRY_DSN: "https://example@sentry.io/123",
  SENTRY_ORG: "scorence",
  SENTRY_PROJECT: "javascript-nextjs",
} as const;

describe("publicEnvSchema", () => {
  it("parses valid public env", () => {
    const result = publicEnvSchema.safeParse(validPublicEnv);
    expect(result.success).toBe(true);
  });

  it("throws when a required public var is missing", () => {
    const incomplete = {
      ...validPublicEnv,
      NEXT_PUBLIC_SITE_URL: undefined,
    };

    expect(() => parsePublicEnv(incomplete)).toThrow(
      /Invalid public environment variables/
    );
    expect(() => parsePublicEnv(incomplete)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("derives site URL and app env from Vercel when unset", () => {
    const parsed = parsePublicEnv({
      ...validPublicEnv,
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_APP_ENV: undefined,
      VERCEL_URL: "my-preview.vercel.app",
      VERCEL_ENV: "preview",
    });

    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe("https://my-preview.vercel.app");
    expect(parsed.NEXT_PUBLIC_APP_ENV).toBe("development");
  });
});

describe("serverEnvSchema", () => {
  it("parses valid server env", () => {
    const result = serverEnvSchema.safeParse(validServerEnv);
    expect(result.success).toBe(true);
  });

  it("parses without optional Redis vars", () => {
    expect(() => parseServerEnv(validServerEnv)).not.toThrow();
  });

  it("accepts optional Redis vars when present", () => {
    expect(() =>
      parseServerEnv({
        ...validServerEnv,
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "upstash_test_token",
      })
    ).not.toThrow();
  });

  it("accepts optional API-Football vars when present", () => {
    expect(() =>
      parseServerEnv({
        ...validServerEnv,
        API_FOOTBALL_KEY: "api_football_test_key",
        API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
      })
    ).not.toThrow();
  });

  it("throws when a required server var is missing", () => {
    const incomplete = {
      ...validServerEnv,
      RESEND_API_KEY: undefined,
    };

    expect(() => parseServerEnv(incomplete)).toThrow(
      /Invalid server environment variables/
    );
    expect(() => parseServerEnv(incomplete)).toThrow(/RESEND_API_KEY/);
  });
});
