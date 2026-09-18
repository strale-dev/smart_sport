/**
 * Phase 7 Lighthouse gate — match, dashboard, landing.
 *
 * Prerequisites: production server running (npm run build && npm run start)
 *
 *   node scripts/quality-lighthouse-check.mjs
 *   QUALITY_BASE_URL=https://your-preview.vercel.app node scripts/quality-lighthouse-check.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const DEFAULT_PORT = process.env.PORT ?? "3000";
const BASE_URL =
  process.env.QUALITY_BASE_URL ??
  process.env.UI_P3_BASE_URL ??
  `http://127.0.0.1:${DEFAULT_PORT}`;
const FIXTURE_ID = process.env.QUALITY_MATCH_FIXTURE_ID ?? "1570355";

const THRESHOLDS = {
  mobile: { performance: 0.8, accessibility: 0.95 },
  desktop: { performance: 0.9, accessibility: 0.95 },
};

const PAGES = [
  { slug: "match", path: `/matches/${FIXTURE_ID}` },
  { slug: "dashboard", path: "/dashboard" },
  { slug: "landing", path: "/" },
];

function runStaticAudits() {
  const audit = spawnSync("node", ["scripts/ui-p3-lcp-audit.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (audit.status !== 0) {
    process.exit(audit.status ?? 1);
  }
}

function probeBaseUrl() {
  try {
    const res = spawnSync(
      process.platform === "win32" ? "curl.exe" : "curl",
      ["-sf", "-o", "NUL", "-w", "%{http_code}", `${BASE_URL}/`],
      { encoding: "utf8", shell: false }
    );
    const code = res.stdout?.trim();
    if (code && code.startsWith("2")) {
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

function runLighthouse(url, formFactor, outFile) {
  const isMobile = formFactor === "mobile";
  const args = [
    "lighthouse",
    url,
    "--quiet",
    "--chrome-flags=--headless",
    "--only-categories=performance,accessibility",
    "--output=json",
    `--output-path=${outFile}`,
  ];

  if (isMobile) {
    args.push("--form-factor=mobile", "--screenEmulation.mobile");
  } else {
    args.push("--preset=desktop");
  }

  const lh = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  return lh.status === 0 && fs.existsSync(outFile);
}

runStaticAudits();

if (!probeBaseUrl()) {
  console.error(
    `Quality Lighthouse: ${BASE_URL} is not reachable. Run \`npm run build && npm run start\` or set QUALITY_BASE_URL to a live preview.`
  );
  process.exit(1);
}

const failures = [];

for (const page of PAGES) {
  for (const formFactor of ["mobile", "desktop"]) {
    const url = `${BASE_URL}${page.path}`;
    const outFile = path.join(
      repoRoot,
      `.lighthouse-quality-${page.slug}-${formFactor}.json`
    );
    console.log(`\n▶ Lighthouse ${formFactor} — ${page.slug} (${url})`);

    if (!runLighthouse(url, formFactor, outFile)) {
      failures.push(`${page.slug}/${formFactor}: Lighthouse failed to run`);
      continue;
    }

    const report = JSON.parse(fs.readFileSync(outFile, "utf8"));
    const perf = report.categories?.performance?.score ?? 0;
    const a11y = report.categories?.accessibility?.score ?? 0;
    const min = THRESHOLDS[formFactor];

    console.log(
      `   performance=${(perf * 100).toFixed(0)} accessibility=${(a11y * 100).toFixed(0)}`
    );

    if (perf < min.performance) {
      failures.push(
        `${page.slug}/${formFactor}: performance ${(perf * 100).toFixed(0)} < ${min.performance * 100}`
      );
    }
    if (a11y < min.accessibility) {
      failures.push(
        `${page.slug}/${formFactor}: accessibility ${(a11y * 100).toFixed(0)} < ${min.accessibility * 100}`
      );
    }
  }
}

if (failures.length > 0) {
  console.error("\nQuality Lighthouse thresholds not met:");
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  console.error(
    "Tip: Vercel preview often scores higher than local 127.0.0.1; re-run with QUALITY_BASE_URL=<preview> for launch sign-off."
  );
  process.exit(1);
}

console.log("\nQuality Lighthouse thresholds passed.");
