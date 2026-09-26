#!/usr/bin/env node
/**
 * RCA Phase 3 Definition of Done — regression tests + observability wiring.
 * Run: npm run rca:phase3:check
 *
 * Prerequisites: none (unit tests only).
 * Manual: confirm Vercel log drain can filter `[ingestion]` JSON; PostHog Live Events for `ingestion_cron_completed`.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function run(label, command, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`✗ ${label} failed`);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ ${label}`);
}

function checkDocs() {
  console.log("\n▶ RCA Phase 3 doc checks");
  const impl = path.join(root, "docs", "rca", "PHASE-3-IMPLEMENTATION.md");
  const events = path.join(root, "docs", "EVENTS.md");

  if (!fs.existsSync(impl)) {
    console.error("✗ docs/rca/PHASE-3-IMPLEMENTATION.md missing");
    process.exit(1);
  }

  const eventsText = fs.readFileSync(events, "utf8");
  if (!eventsText.includes("ingestion_cron_completed")) {
    console.error("✗ docs/EVENTS.md missing ingestion_cron_completed");
    process.exit(1);
  }

  if (
    !fs.existsSync(
      path.join(root, "lib", "ingestion", "ingestion-observability.ts")
    )
  ) {
    console.error("✗ lib/ingestion/ingestion-observability.ts missing");
    process.exit(1);
  }

  console.log("✓ RCA Phase 3 doc checks");
}

checkDocs();
run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("RCA Phase 3 ingestion unit tests", "npm.cmd", [
  "exec",
  "vitest",
  "run",
  "lib/ingestion/cron-outcome.test.ts",
  "lib/ingestion/cron-run.test.ts",
  "lib/ingestion/gha-cron-trigger.test.ts",
  "lib/ingestion/ingestion-observability.test.ts",
  "lib/ingestion/warm-ai-prematch.test.ts",
  "lib/ingestion/sync-fixtures-future.test.ts",
  "lib/ingestion/fixture-prematch-readiness.test.ts",
  "lib/ingestion/live-polling-cron-isolation.test.ts",
  "lib/ai/prematch-narrative-eligibility.test.ts",
]);

console.log("\nRCA Phase 3 automated checks passed.");
console.log(
  "Next: Phase 4 production verification on real fixtures (see docs/rca plan)."
);
