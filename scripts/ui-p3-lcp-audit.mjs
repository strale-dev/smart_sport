/**
 * UI-P3 static LCP guardrails for match header scoreboard.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const errors = [];

const presetsPath = path.join(repoRoot, "lib/match/scoreboard-presets.ts");
const presetsSource = fs.readFileSync(presetsPath, "utf8");

if (!/logoPriority:\s*true/.test(presetsSource)) {
  errors.push(
    "lib/match/scoreboard-presets.ts: header preset must set logoPriority: true"
  );
}

const teamLogoPath = path.join(repoRoot, "components/match/TeamLogo.tsx");
const teamLogoSource = fs.readFileSync(teamLogoPath, "utf8");

if (!/from\s+["']next\/image["']/.test(teamLogoSource)) {
  errors.push(
    "components/match/TeamLogo.tsx: must use next/image for remote logos"
  );
}

const nextConfigPath = path.join(repoRoot, "next.config.ts");
const nextConfigSource = fs.readFileSync(nextConfigPath, "utf8");

if (!/media\.api-sports\.io/.test(nextConfigSource)) {
  errors.push(
    "next.config.ts: missing images.remotePatterns for media.api-sports.io"
  );
}

const matchHeaderPath = path.join(repoRoot, "components/match/MatchHeader.tsx");
const matchHeaderSource = fs.readFileSync(matchHeaderPath, "utf8");

if (!/leagueLogoPriority/.test(matchHeaderSource)) {
  errors.push(
    "components/match/MatchHeader.tsx: MatchMetaBar must pass leagueLogoPriority on match page"
  );
}

if (
  !/getMatchScoreboardPreset\s*\(\s*["']header["']\s*\)/.test(matchHeaderSource)
) {
  errors.push(
    "components/match/MatchHeader.tsx: must use header scoreboard preset"
  );
}

const pagePath = path.join(repoRoot, "app/(app)/matches/[fixtureId]/page.tsx");
const pageSource = fs.readFileSync(pagePath, "utf8");

if (
  !/<MatchHeader fixture=\{fixture\} \/>[\s\S]*<AIInsightProvider/.test(
    pageSource
  )
) {
  errors.push(
    "app/(app)/matches/[fixtureId]/page.tsx: MatchHeader should render outside AIInsightProvider"
  );
}

if (!/MatchAIHeroSection/.test(pageSource)) {
  errors.push(
    "app/(app)/matches/[fixtureId]/page.tsx: use MatchAIHeroSection for deferred AI hero bundle"
  );
}

if (errors.length > 0) {
  console.error("UI-P3 LCP audit failed:\n");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log("UI-P3 LCP audit passed.");
