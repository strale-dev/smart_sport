#!/usr/bin/env node
/**
 * Phase 2 Definition of Done — automated checks.
 * Run: npm run phase2:check
 *
 * Prerequisites in .env.local:
 * - Supabase service role, API_FOOTBALL_INGEST_ONLY=true (development default)
 * - Fixtures synced (npm run sync:fixtures) for dashboard + ingestion checks
 *
 * Manual follow-ups (see docs/ROADMAP.md §5 Phase 2 DoD):
 * - Mobile 375px walkthrough
 * - PostHog Live Events (signup_completed, login_completed, match_viewed)
 * - Fixtures staging QA (multi-day grouping, scroll anchor, empty states)
 * - MCP get_advisors on user-supabasei
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

  if (!/^SUPABASE_SERVICE_ROLE_KEY=\S+/m.test(env)) {
    warnings.push(
      "SUPABASE_SERVICE_ROLE_KEY is missing — required for Postgres reads"
    );
  }

  if (!/^NEXT_PUBLIC_POSTHOG_KEY=phc_/m.test(env)) {
    warnings.push(
      "NEXT_PUBLIC_POSTHOG_KEY should use Project API key (phc_...) for Live Events"
    );
  }

  if (/^API_FOOTBALL_INGEST_ONLY=false/m.test(env)) {
    warnings.push(
      "API_FOOTBALL_INGEST_ONLY=false — Phase 2 DoD expects Postgres reads in development"
    );
  }

  const eventsPath = path.join(root, "docs", "EVENTS.md");
  if (!fs.existsSync(eventsPath)) {
    warnings.push("docs/EVENTS.md missing — Phase 2 cross-cutting deliverable");
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
run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("Lint", "npm.cmd", ["run", "lint"]);
run("Tests", "npm.cmd", ["run", "test:ci"]);
run("Verify ingestion (UTC today)", "npm.cmd", ["run", "verify:ingestion"]);
run("Dashboard smoke (ingest-only Postgres path)", "npm.cmd", [
  "run",
  "phase2:dashboard-smoke",
]);
run("Fixtures smoke (7-day grouping + anchors)", "npm.cmd", [
  "run",
  "phase2:fixtures-smoke",
]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 2 automated checks passed.");
console.log(
  "Complete manual DoD: mobile QA, PostHog Live Events, fixtures staging walkthrough — see docs/ROADMAP.md §5."
);
