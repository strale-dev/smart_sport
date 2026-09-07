#!/usr/bin/env node
/**
 * Phase 4 Definition of Done — automated checks.
 * Run: npm run phase4:check
 *
 * Prerequisites in .env.local:
 * - Supabase service role, API_FOOTBALL_INGEST_ONLY=true
 * - OPENAI_API_KEY (for phase4:ai-smoke cache verification)
 * - Fixtures synced (npm run sync:fixtures) with upcoming NS rows
 *
 * Manual follow-ups (see docs/ROADMAP.md §7 Phase 4 DoD):
 * - Signed-in browser walkthrough on NS fixture (AI hero generate + cached view)
 * - Guest incognito → AIHeroLockedCard blurred CTA
 * - PostHog Live Events for ai_generate_clicked, ai_limit_reached
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

  if (!/^OPENAI_API_KEY=\S+/m.test(env)) {
    warnings.push("OPENAI_API_KEY is missing — required for phase4:ai-smoke");
  }

  if (!/^NEXT_PUBLIC_POSTHOG_KEY=phc_/m.test(env)) {
    warnings.push(
      "NEXT_PUBLIC_POSTHOG_KEY should use Project API key (phc_...) for Live Events"
    );
  }

  if (/^API_FOOTBALL_INGEST_ONLY=false/m.test(env)) {
    warnings.push(
      "API_FOOTBALL_INGEST_ONLY=false — Phase 4 DoD expects Postgres reads in development"
    );
  }

  const eventsPath = path.join(root, "docs", "EVENTS.md");
  if (!fs.existsSync(eventsPath)) {
    warnings.push("docs/EVENTS.md missing — Phase 4 PostHog catalog");
  } else if (!/ai_generate_clicked/.test(fs.readFileSync(eventsPath, "utf8"))) {
    warnings.push("docs/EVENTS.md missing Phase 4 AI events");
  }

  const methodologyPath = path.join(
    root,
    "app",
    "(marketing)",
    "methodology",
    "page.tsx"
  );
  if (!fs.existsSync(methodologyPath)) {
    warnings.push("/methodology page missing — Phase 4 deliverable");
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
run("Prediction smoke (10 upcoming fixtures)", "npm.cmd", [
  "run",
  "phase4:prediction-smoke",
]);
run("AI smoke (generate + cache hit)", "npm.cmd", ["run", "phase4:ai-smoke"]);
run("Match page smoke (prediction + insight + players path)", "npm.cmd", [
  "run",
  "phase4:match-smoke",
]);
run("Match page smoke (Phase 3 regression)", "npm.cmd", [
  "run",
  "phase3:match-smoke",
]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 4 automated checks passed.");
console.log(
  "Complete manual DoD: signed-in AI hero walkthrough, guest locked card, PostHog Live Events — see docs/ROADMAP.md §7."
);
