import fs from "node:fs";
import path from "node:path";

import "@testing-library/jest-dom/vitest";

import { loadLocalEnvForScripts } from "@/lib/env/load-local";

loadLocalEnvForScripts(path.resolve(__dirname, ".."));

// Keep vitest env valid even when .env.local has placeholder or personal keys.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
process.env.NEXT_PUBLIC_POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "pk_test";
process.env.NEXT_PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://scorence.app";
process.env.NEXT_PUBLIC_APP_ENV = "development";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service_role_test";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test";
process.env.RESEND_FROM =
  process.env.RESEND_FROM ?? "Scorence <hello@scorence.app>";
process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ?? "https://example@sentry.io/123";
process.env.SENTRY_ORG = process.env.SENTRY_ORG ?? "scorence";
process.env.SENTRY_PROJECT = process.env.SENTRY_PROJECT ?? "javascript-nextjs";
