#!/usr/bin/env node
/**
 * Phase 7 Quality — automated checks.
 * Run: npm run phase7:check
 * Full (Lighthouse + axe + optional k6): npm run phase7:check -- --full
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fullMode =
  process.argv.includes("--full") || process.env.QUALITY_RUN_FULL === "1";

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

function checkQualityEnv() {
  console.log("\n▶ Quality env hints (.env.local)");
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.warn("⚠ .env.local missing — see docs/QA-PHASE7.md");
    return;
  }
  const env = fs.readFileSync(envPath, "utf8");
  const warnings = [];
  if (!/^PLAYWRIGHT_QA_EMAIL=\S+/m.test(env)) {
    warnings.push("PLAYWRIGHT_QA_EMAIL — for auth e2e / k6");
  }
  if (!/^PLAYWRIGHT_QA_PASSWORD=\S+/m.test(env)) {
    warnings.push("PLAYWRIGHT_QA_PASSWORD — for auth e2e / k6");
  }
  if (!/^PHASE6_QA_USER_ID=\S+/m.test(env)) {
    warnings.push(
      "PHASE6_QA_USER_ID — optional; qa@scorence.app UUID for follow smoke"
    );
  }
  for (const w of warnings) {
    console.warn(`⚠ ${w}`);
  }
  if (warnings.length === 0) {
    console.log("✓ QA env vars present");
  }
}

checkQualityEnv();
run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("Lint", "npm.cmd", ["run", "lint"]);
run("Tests", "npm.cmd", ["run", "test:ci"]);
run("PRD principles audit", "node", ["scripts/quality-prd-audit.mjs"]);
run("LCP static guardrails", "node", ["scripts/ui-p3-lcp-audit.mjs"]);

if (fullMode) {
  run("Axe critical (Playwright)", "npm.cmd", ["run", "quality:axe"]);
  run("Lighthouse quality gate", "node", [
    "scripts/quality-lighthouse-check.mjs",
  ]);

  const k6 = spawnSync("k6", ["version"], { shell: true, encoding: "utf8" });
  if (k6.status === 0) {
    run("k6 load smoke", "npm.cmd", ["run", "quality:k6"]);
  } else {
    console.warn(
      "\n⚠ k6 not installed — skip load test (see scripts/k6/README.md)"
    );
  }
} else {
  console.log(
    "\nℹ Skipping Lighthouse/axe/k6 (pass --full or QUALITY_RUN_FULL=1). Manual QA: docs/QA-PHASE7.md"
  );
}

console.log("\nPhase 7 automated checks passed.");
