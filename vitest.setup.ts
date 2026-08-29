import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, ".env.local"));
loadEnvFile(path.resolve(__dirname, ".env.example"));

// Keep vitest env valid even when .env.local has placeholder or personal keys.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
process.env.NEXT_PUBLIC_POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "pk_test";
process.env.NEXT_PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kivora.app";
process.env.NEXT_PUBLIC_APP_ENV = "development";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service_role_test";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test";
process.env.RESEND_FROM =
  process.env.RESEND_FROM ?? "Kivora <hello@kivora.app>";
process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ?? "https://example@sentry.io/123";
process.env.SENTRY_ORG = process.env.SENTRY_ORG ?? "kivora";
process.env.SENTRY_PROJECT = process.env.SENTRY_PROJECT ?? "kivora-web";
