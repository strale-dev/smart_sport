#!/usr/bin/env node
/**
 * Heuristic PRD §4 / §5 sanity checks (automated; manual checklist in docs/QA-PHASE7.md).
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

const BANNED_PATTERNS = [
  { re: /\bbookmaker\b/i, label: "bookmaker" },
  { re: /\bvalue bet\b/i, label: "value bet" },
  {
    re: /\bodds\b/i,
    label: "odds",
    allowIn: ["node_modules", ".next", "docs", "Sports_AI"],
  },
];

const ALLOWLIST_PATH_FRAGMENTS = [
  "HeroProductMock",
  "design-system-playground",
  "PredictionsCenterLocked",
  ".test.",
  ".spec.",
  "lib/legal",
  "lib/marketing",
  "lib/ai/prompts",
  "lib/emails",
  "SignupBenefits",
  "ProductScreensSection",
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "coverage"].includes(entry.name)) {
        continue;
      }
      walk(full, files);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isAllowlisted(filePath) {
  const rel = path.relative(root, filePath);
  return ALLOWLIST_PATH_FRAGMENTS.some((frag) => rel.includes(frag));
}

const scanRoots = [
  path.join(root, "app"),
  path.join(root, "components"),
  path.join(root, "lib"),
];

for (const file of scanRoots.flatMap((d) => walk(d))) {
  if (isAllowlisted(file)) {
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  for (const { re, label, allowIn } of BANNED_PATTERNS) {
    if (allowIn?.some((part) => file.includes(part))) {
      continue;
    }
    if (re.test(text)) {
      warnings.push(
        `${path.relative(root, file)}: contains "${label}" (review copy)`
      );
    }
  }
}

const statePages = [
  "app/(app)/dashboard/page.tsx",
  "app/(app)/fixtures/page.tsx",
  "app/(app)/live/page.tsx",
  "app/(app)/favorites/page.tsx",
  "app/(app)/matches/[fixtureId]/page.tsx",
];

for (const rel of statePages) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    warnings.push(`Missing expected page: ${rel}`);
    continue;
  }
  const src = fs.readFileSync(full, "utf8");
  if (
    !/EmptyState|ErrorState|StaleBadge|unavailable|not available/i.test(src)
  ) {
    warnings.push(
      `${rel}: no obvious empty/error/stale handling import or copy (manual verify)`
    );
  }
}

const aiDisclaimerPaths = walk(path.join(root, "components/ai"));
const hasDisclaimer = aiDisclaimerPaths.some((f) => {
  const t = fs.readFileSync(f, "utf8");
  return /disclaimer|not betting|analytical estimate/i.test(t);
});
if (!hasDisclaimer) {
  warnings.push("components/ai: no disclaimer pattern detected");
}

if (warnings.length) {
  console.log("PRD audit warnings:");
  for (const w of warnings) {
    console.warn(`  ⚠ ${w}`);
  }
}

if (errors.length) {
  console.error("PRD audit failed:");
  for (const e of errors) {
    console.error(`  ✗ ${e}`);
  }
  process.exit(1);
}

console.log("✓ quality:prd-audit passed (review warnings above if any).");
