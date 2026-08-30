#!/usr/bin/env node
/**
 * Phase 0 Definition of Done — automated checks.
 * Run: npm run phase0:check
 *
 * Manual follow-ups (require dashboard credentials):
 * - Replace SENTRY_DSN placeholder with a real DSN, then GET /api/debug/sentry-test
 * - Use PostHog Project API key (phc_...) in NEXT_PUBLIC_POSTHOG_KEY
 * - Verify Resend email from hello@scorence.app after domain verification
 * - vercel login && vercel deploy
 * - supabase db reset (requires Docker Desktop for local stack)
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function run(label, command, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });

  if (result.status !== 0) {
    console.error(`✗ ${label} failed`);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ ${label}`);
}

function checkEnvFile() {
  console.log("\n▶ Env sanity checks (.env.local)");
  const envPath = path.join(root, ".env.local");

  if (!fs.existsSync(envPath)) {
    console.warn("⚠ .env.local missing — copy from .env.example");
    return;
  }

  const env = fs.readFileSync(envPath, "utf8");
  const warnings = [];

  if (/examplePublicKey@o0\.ingest/.test(env)) {
    warnings.push("SENTRY_DSN is still the example placeholder");
  }

  if (/NEXT_PUBLIC_POSTHOG_KEY=phx_/.test(env)) {
    warnings.push(
      "NEXT_PUBLIC_POSTHOG_KEY looks like a personal key (phx_) — use Project API key (phc_)"
    );
  }

  if (!/NEXT_PUBLIC_SITE_URL=https:\/\/scorence\.app/.test(env)) {
    warnings.push(
      "NEXT_PUBLIC_SITE_URL should be https://scorence.app for production (use localhost only for local-only dev)"
    );
  }

  if (
    !/RESEND_FROM=(?:Scorence <hello@scorence\.app>|"Scorence <hello@scorence\.app>")/.test(
      env
    )
  ) {
    warnings.push(
      "RESEND_FROM should be Scorence <hello@scorence.app> after Resend domain verification"
    );
  }

  if (!/NEXT_PUBLIC_SENTRY_DSN=/.test(env)) {
    warnings.push(
      "Add NEXT_PUBLIC_SENTRY_DSN (same value as SENTRY_DSN) for client-side error capture"
    );
  }

  if (!/^API_FOOTBALL_KEY=\S+/m.test(env)) {
    warnings.push(
      "API_FOOTBALL_KEY is missing — required for cache smoke and cron ingest"
    );
  }

  if (!/^UPSTASH_REDIS_REST_URL=\S+/m.test(env)) {
    warnings.push(
      "UPSTASH_REDIS_REST_URL is missing — cache falls back to in-memory only"
    );
  }

  if (!/^UPSTASH_REDIS_REST_TOKEN=\S+/m.test(env)) {
    warnings.push(
      "UPSTASH_REDIS_REST_TOKEN is missing — cache falls back to in-memory only"
    );
  }

  if (/your-project\.supabase\.co/.test(env)) {
    warnings.push(
      "Supabase env vars are still placeholders — replace with dev project credentials"
    );
  }

  if (!/^API_FOOTBALL_DAILY_LIMIT=\d+/m.test(env)) {
    warnings.push("Set API_FOOTBALL_DAILY_LIMIT (100 for Free, 7500 for Pro)");
  }

  if (warnings.length === 0) {
    console.log("✓ No obvious env issues");
    return;
  }

  for (const warning of warnings) {
    console.warn(`⚠ ${warning}`);
  }
}

checkEnvFile();
run("Migration filenames", "node", ["scripts/verify-supabase-migrations.mjs"]);
run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("Tests", "npm.cmd", ["run", "test:ci"]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 0 automated checks passed.");
console.log(
  "Complete manual DoD items listed in scripts/phase0-dod-check.mjs header."
);
