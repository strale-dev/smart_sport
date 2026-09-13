/**
 * UI-P2 static motion consistency audit.
 * Fails if scoped app surfaces import LiveDot or use motion/react without @/lib/motion helpers.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const SCOPED_DIRS = [
  "components/dashboard",
  "components/fixtures",
  "components/match",
  "components/live",
  "components/ai",
];

const LIVE_DOT_ALLOWLIST = new Set([
  path.normalize("components/common/LiveDot.tsx"),
  path.normalize("components/marketing/HeroProductMock.tsx"),
]);

const MOTION_IMPORT_ALLOWLIST = new Set([
  path.normalize("components/ds/design-system-playground.tsx"),
]);

function walkTsxFiles(dir) {
  const abs = path.join(repoRoot, dir);
  if (!fs.existsSync(abs)) {
    return [];
  }

  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsxFiles(rel));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function relativeNormalized(filePath) {
  return path.normalize(path.relative(repoRoot, filePath));
}

const errors = [];

for (const dir of SCOPED_DIRS) {
  for (const rel of walkTsxFiles(dir)) {
    const normalized = relativeNormalized(rel);
    const content = fs.readFileSync(path.join(repoRoot, rel), "utf8");

    if (
      /from\s+["']@\/components\/common\/LiveDot["']/.test(content) &&
      !LIVE_DOT_ALLOWLIST.has(normalized)
    ) {
      errors.push(
        `${normalized}: imports deprecated LiveDot (use LiveStatusChip)`
      );
    }

    if (
      /from\s+["']motion\/react["']/.test(content) &&
      !MOTION_IMPORT_ALLOWLIST.has(normalized)
    ) {
      const usesLibMotion =
        /from\s+["']@\/lib\/motion["']/.test(content) ||
        /from\s+["']@\/components\/ai\/AIHeroMotionSection["']/.test(content);
      if (!usesLibMotion) {
        errors.push(
          `${normalized}: uses motion/react without @/lib/motion or AIHeroMotionSection`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error("UI-P2 motion audit failed:\n");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log("UI-P2 motion audit passed.");
