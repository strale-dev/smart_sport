#!/usr/bin/env node
/**
 * Phase 1 Definition of Done — automated checks.
 * Run: npm run phase1:check
 *
 * Prerequisites in .env.local:
 * - API_FOOTBALL_KEY, Supabase service role, Upstash Redis
 * - API_FOOTBALL_INGEST_ONLY=true (default in development)
 *
 * Manual follow-ups:
 * - Run MCP get_advisors (security + performance) on user-supabasei
 * - Phase 0 founder items: Vercel deploy, Resend DNS, PostHog phc_ key, Sentry DSN test
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

  if (!/^API_FOOTBALL_KEY=\S+/m.test(env)) {
    warnings.push(
      "API_FOOTBALL_KEY is missing — required for sync and smoke tests"
    );
  }

  if (!/^UPSTASH_REDIS_REST_URL=\S+/m.test(env)) {
    warnings.push(
      "UPSTASH_REDIS_REST_URL is missing — Phase 1 cache DoD requires Redis"
    );
  }

  if (!/^UPSTASH_REDIS_REST_TOKEN=\S+/m.test(env)) {
    warnings.push(
      "UPSTASH_REDIS_REST_TOKEN is missing — Phase 1 cache DoD requires Redis"
    );
  }

  if (!/^SUPABASE_SERVICE_ROLE_KEY=\S+/m.test(env)) {
    warnings.push(
      "SUPABASE_SERVICE_ROLE_KEY is missing — required for Postgres ingest reads"
    );
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
run("Verify ingestion (UTC today)", "npm.cmd", ["run", "verify:ingestion"]);
run("Cache smoke (Redis, ≥90% hit rate)", "npm.cmd", ["run", "cache:smoke"]);
run("Quota smoke (stale fallback)", "npm.cmd", ["run", "quota:smoke"]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 1 automated checks passed.");
console.log(
  "Complete manual DoD: MCP get_advisors (security + performance) on user-supabasei — expect 0 WARN/ERROR."
);
