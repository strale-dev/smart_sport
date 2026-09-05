#!/usr/bin/env node
/**
 * Phase 3 Definition of Done — automated checks.
 * Run: npm run phase3:check
 *
 * Prerequisites in .env.local:
 * - Supabase service role, API_FOOTBALL_INGEST_ONLY=true
 * - Fixtures synced; bootstrap:match-details for FT stats/events/lineups QA
 *
 * Manual follow-ups (see docs/ROADMAP.md §6 Phase 3 DoD):
 * - Desktop walkthrough on FT + NS fixtures
 * - Mobile 375px layout check
 * - Lighthouse mobile performance ≥ 80 on match page
 * - PostHog Live Events for match_form_scope_changed, match_h2h_scope_changed, match_momentum_viewed
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
      "API_FOOTBALL_INGEST_ONLY=false — Phase 3 DoD expects Postgres reads in development"
    );
  }

  const eventsPath = path.join(root, "docs", "EVENTS.md");
  if (!fs.existsSync(eventsPath)) {
    warnings.push("docs/EVENTS.md missing — Phase 3 PostHog catalog");
  } else if (
    !/match_form_scope_changed/.test(fs.readFileSync(eventsPath, "utf8"))
  ) {
    warnings.push("docs/EVENTS.md missing Phase 3 match analytics events");
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
run("Match page smoke (analytics + match details path)", "npm.cmd", [
  "run",
  "phase3:match-smoke",
]);
run("Phase 3 risks verify (xG partial + lineups empty)", "npm.cmd", [
  "run",
  "phase3:risks-verify",
]);
run("Dashboard smoke (regression)", "npm.cmd", [
  "run",
  "phase2:dashboard-smoke",
]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 3 automated checks passed.");
console.log(
  "Complete manual DoD: FT/NS fixture walkthrough, mobile 375px, Lighthouse ≥ 80, PostHog Live Events — see docs/ROADMAP.md §6."
);
