import { z } from "zod";

const appEnvSchema = z.enum(["development", "production"]);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: appEnvSchema,
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  API_FOOTBALL_KEY: z.string().min(1).optional(),
  API_FOOTBALL_BASE_URL: z.string().url().optional(),
  API_FOOTBALL_DAILY_LIMIT: z.coerce.number().int().positive().optional(),
  API_FOOTBALL_INGEST_ONLY: z.enum(["true", "false", "1", "0"]).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_DEFAULT: z.string().min(1).optional(),
  FREE_TIER_AI_PREDICTIONS_PER_DAY: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  AI_PREMATCH_CACHE_TTL_SEC: z.coerce.number().int().positive().optional(),
  AI_PROMPT_VERSION: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().min(1),
  SENTRY_DSN: z.string().url(),
  SENTRY_ORG: z.string().min(1),
  SENTRY_PROJECT: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

import { normalizeEnvValue } from "@/lib/env/load-local";

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === "" || value === undefined) {
    return undefined;
  }

  return normalizeEnvValue(value);
}

function readPublicEnvSource(
  source: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: source.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: source.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_ENV: source.NEXT_PUBLIC_APP_ENV,
  };
}

function readServerEnvSource(
  source: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    ...readPublicEnvSource(source),
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: emptyToUndefined(source.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: emptyToUndefined(source.UPSTASH_REDIS_REST_TOKEN),
    API_FOOTBALL_KEY: emptyToUndefined(source.API_FOOTBALL_KEY),
    API_FOOTBALL_BASE_URL: emptyToUndefined(source.API_FOOTBALL_BASE_URL),
    API_FOOTBALL_DAILY_LIMIT: emptyToUndefined(source.API_FOOTBALL_DAILY_LIMIT),
    API_FOOTBALL_INGEST_ONLY: emptyToUndefined(source.API_FOOTBALL_INGEST_ONLY),
    CRON_SECRET: emptyToUndefined(source.CRON_SECRET),
    OPENAI_API_KEY: emptyToUndefined(source.OPENAI_API_KEY),
    OPENAI_MODEL_DEFAULT: emptyToUndefined(source.OPENAI_MODEL_DEFAULT),
    FREE_TIER_AI_PREDICTIONS_PER_DAY: emptyToUndefined(
      source.FREE_TIER_AI_PREDICTIONS_PER_DAY
    ),
    AI_PREMATCH_CACHE_TTL_SEC: emptyToUndefined(
      source.AI_PREMATCH_CACHE_TTL_SEC
    ),
    AI_PROMPT_VERSION: emptyToUndefined(source.AI_PROMPT_VERSION),
    RESEND_API_KEY: source.RESEND_API_KEY,
    RESEND_FROM: source.RESEND_FROM,
    SENTRY_DSN: source.SENTRY_DSN,
    SENTRY_ORG: source.SENTRY_ORG,
    SENTRY_PROJECT: source.SENTRY_PROJECT,
  };
}

export function parsePublicEnv(
  source: Record<string, string | undefined> = process.env
): PublicEnv {
  const result = publicEnvSchema.safeParse(readPublicEnvSource(source));

  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatZodError(result.error)}`
    );
  }

  return result.data;
}

export function parseServerEnv(
  source: Record<string, string | undefined> = process.env
): ServerEnv {
  const result = serverEnvSchema.safeParse(readServerEnvSource(source));

  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatZodError(result.error)}`
    );
  }

  return result.data;
}

export function hasRedisConfig(
  source: Record<string, string | undefined>
): boolean {
  return Boolean(
    emptyToUndefined(source.UPSTASH_REDIS_REST_URL) &&
    emptyToUndefined(source.UPSTASH_REDIS_REST_TOKEN)
  );
}

export function hasApiFootballConfig(
  source: Record<string, string | undefined>
): boolean {
  return Boolean(emptyToUndefined(source.API_FOOTBALL_KEY));
}

export const DEFAULT_API_FOOTBALL_BASE_URL =
  "https://v3.football.api-sports.io";

export function getApiFootballDailyLimit(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = emptyToUndefined(source.API_FOOTBALL_DAILY_LIMIT);
  if (!raw) {
    return 100;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function getApiFootballMinuteLimit(
  source: Record<string, string | undefined> = process.env
): number {
  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);
  return NEXT_PUBLIC_APP_ENV === "production" ? 300 : 10;
}

export function getCronSecret(
  source: Record<string, string | undefined> = process.env
): string | undefined {
  return emptyToUndefined(source.CRON_SECRET);
}

export function isApiFootballIngestOnly(
  source: Record<string, string | undefined> = process.env
): boolean {
  const explicit = emptyToUndefined(source.API_FOOTBALL_INGEST_ONLY);
  if (explicit !== undefined) {
    return explicit === "true" || explicit === "1";
  }

  return parsePublicEnv(source).NEXT_PUBLIC_APP_ENV === "development";
}

export function hasOpenAiConfig(
  source: Record<string, string | undefined> = process.env
): boolean {
  return Boolean(emptyToUndefined(source.OPENAI_API_KEY));
}

export function getOpenAiModelDefault(
  source: Record<string, string | undefined> = process.env
): string {
  return emptyToUndefined(source.OPENAI_MODEL_DEFAULT) ?? "gpt-4o-mini";
}

export function getFreeTierAiPredictionsPerDay(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = emptyToUndefined(source.FREE_TIER_AI_PREDICTIONS_PER_DAY);
  if (!raw) {
    return 5;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function getAiPrematchCacheTtlSec(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = emptyToUndefined(source.AI_PREMATCH_CACHE_TTL_SEC);
  if (!raw) {
    return 86_400;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86_400;
}

export function getAiPromptVersion(
  source: Record<string, string | undefined> = process.env
): string {
  return emptyToUndefined(source.AI_PROMPT_VERSION) ?? "1.0.0";
}

export function assertOpenAiConfiguredInProduction(
  source: Record<string, string | undefined> = process.env
): void {
  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);
  if (NEXT_PUBLIC_APP_ENV === "production" && !hasOpenAiConfig(source)) {
    throw new Error(
      "OPENAI_API_KEY is required in production when AI generation is enabled."
    );
  }
}
