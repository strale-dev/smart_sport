/**
 * UI-P3 Lighthouse gate (optional when production server is running).
 *
 * Default (CI / local): static LCP audits only.
 * Full Lighthouse:
 *   npm run build && npm run start
 *   node scripts/ui-p3-lighthouse-check.mjs --run-lighthouse
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const CANONICAL_PATH = "/matches/1570355";
const DEFAULT_PORT = process.env.PORT ?? "3000";
const BASE_URL =
  process.env.UI_P3_BASE_URL ?? `http://127.0.0.1:${DEFAULT_PORT}`;
const TARGET_URL = `${BASE_URL}${CANONICAL_PATH}`;

const MIN_PERFORMANCE = 0.8;
const MAX_LCP_MS = 2500;

const runLighthouse = process.argv.includes("--run-lighthouse");

function runStaticAudits() {
  const audit = spawnSync("node", ["scripts/ui-p3-lcp-audit.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (audit.status !== 0) {
    process.exit(audit.status ?? 1);
  }
}

runStaticAudits();

if (!runLighthouse) {
  console.log(
    `UI-P3: skipped Lighthouse (pass --run-lighthouse after \`npm run build && npm run start\`). Canonical URL: ${TARGET_URL}`
  );
  process.exit(0);
}

const outFile = path.join(repoRoot, ".lighthouse-ui-p3.json");
const lh = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "lighthouse",
    TARGET_URL,
    "--quiet",
    "--chrome-flags=--headless",
    "--only-categories=performance",
    "--form-factor=mobile",
    "--screenEmulation.mobile",
    "--output=json",
    `--output-path=${outFile}`,
  ],
  { cwd: repoRoot, stdio: "inherit" }
);

if (lh.status !== 0 || !fs.existsSync(outFile)) {
  console.error("UI-P3: Lighthouse failed to run.");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(outFile, "utf8"));
const performanceScore = report.categories?.performance?.score ?? 0;
const lcpMs =
  report.audits?.["largest-contentful-paint"]?.numericValue ?? Infinity;

console.log(
  `UI-P3 Lighthouse: performance=${(performanceScore * 100).toFixed(0)} LCP=${(lcpMs / 1000).toFixed(2)}s (${TARGET_URL})`
);

const failures = [];
if (performanceScore < MIN_PERFORMANCE) {
  failures.push(
    `performance score ${(performanceScore * 100).toFixed(0)} < ${MIN_PERFORMANCE * 100}`
  );
}
if (lcpMs > MAX_LCP_MS) {
  failures.push(`LCP ${lcpMs.toFixed(0)}ms > ${MAX_LCP_MS}ms`);
}

if (failures.length > 0) {
  console.error("UI-P3 Lighthouse thresholds not met:");
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  console.error(
    "Note: local scores may be below Vercel preview; re-verify on preview before launch."
  );
  process.exit(1);
}

console.log("UI-P3 Lighthouse thresholds passed.");
