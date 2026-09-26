#!/usr/bin/env node
/**
 * RCA Phase 4 Definition of Done — production verification gate.
 * Run: npm run rca:phase4:check
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
  console.log("\n▶ RCA Phase 4 doc checks");
  const impl = path.join(root, "docs", "rca", "PHASE-4-IMPLEMENTATION.md");
  if (!fs.existsSync(impl)) {
    console.error("✗ docs/rca/PHASE-4-IMPLEMENTATION.md missing");
    process.exit(1);
  }
  console.log("✓ RCA Phase 4 doc checks");
}

checkDocs();
run("RCA Phase 3 regression gate", "npm.cmd", ["run", "rca:phase3:check"]);
run("RCA Phase 4 unit tests", "npm.cmd", [
  "exec",
  "vitest",
  "run",
  "lib/ingestion/rca-prod-verification.test.ts",
]);
run("RCA Phase 4 production verify (strict)", "npm.cmd", [
  "run",
  "rca:phase4:verify",
  "--",
  "--strict",
  "--write-report",
]);

console.log("\nRCA Phase 4 automated checks passed.");
