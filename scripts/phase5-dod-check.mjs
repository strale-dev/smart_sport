#!/usr/bin/env node
/**
 * Phase 5 Definition of Done — automated checks (UI + live backend).
 * Run: npm run phase5:check
 */

import { spawnSync } from "node:child_process";

const root = process.cwd();

function run(label, command, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`✗ ${label} failed`);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ ${label}`);
}

run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("Lint", "npm.cmd", ["run", "lint"]);
run("Tests", "npm.cmd", ["run", "test:ci"]);
run("Verify ingestion (UTC today)", "npm.cmd", ["run", "verify:ingestion"]);
run("Live Realtime RLS verify", "npm.cmd", ["run", "live:verify-rls"]);
run("Phase 5 match smoke (deterministic)", "npm.cmd", [
  "run",
  "phase5:match-smoke",
]);
run("Phase 5 live center smoke", "npm.cmd", [
  "run",
  "phase5:live-center-smoke",
]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 5 automated checks passed.");
console.log(
  "Manual DoD: two-tab broadcast smoke, grace-window poll stop — see docs/LIVE_POLLING.md and docs/ROADMAP.md §8."
);
