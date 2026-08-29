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

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
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
