#!/usr/bin/env node
/**
 * Phase 6 Definition of Done — automated checks.
 * Run: npm run phase6:check
 *
 * Manual founder gate (required before calling Phase 6 done):
 * - docs/BILLING-E2E.md — production LemonSqueezy trial checkout + cancel
 * - ROADMAP.md §9 — free AI cap UI, goal notification ≤10s, Sentry breadcrumbs, PostHog Live Events
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

function checkEnvAndArtifacts() {
  console.log("\n▶ Env / artifact sanity (.env.local + Phase 6 deliverables)");
  const envPath = path.join(root, ".env.local");
  const warnings = [];

  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    if (!/^LEMONSQUEEZY_API_KEY=\S+/m.test(env)) {
      warnings.push(
        "LEMONSQUEEZY_API_KEY missing — billing checkout disabled locally"
      );
    }
    if (!/^LEMONSQUEEZY_WEBHOOK_SECRET=\S+/m.test(env)) {
      warnings.push(
        "LEMONSQUEEZY_WEBHOOK_SECRET missing — webhook route returns 503"
      );
    }
    if (!/^NEXT_PUBLIC_POSTHOG_KEY=phc_/m.test(env)) {
      warnings.push(
        "NEXT_PUBLIC_POSTHOG_KEY should use Project API key (phc_...) for Live Events"
      );
    }
  } else {
    warnings.push(".env.local missing — copy from .env.example");
  }

  const requiredPaths = [
    "app/(marketing)/pricing/page.tsx",
    "app/api/webhooks/lemonsqueezy/route.ts",
    "app/(app)/profile/page.tsx",
    "app/(app)/profile/preferences/page.tsx",
    "components/follow/FollowToggle.tsx",
    "components/follow/FavoriteMatchToggle.tsx",
  ];

  for (const relative of requiredPaths) {
    if (!fs.existsSync(path.join(root, relative))) {
      warnings.push(`Missing deliverable: ${relative}`);
    }
  }

  const eventsPath = path.join(root, "docs", "EVENTS.md");
  if (fs.existsSync(eventsPath)) {
    const eventsDoc = fs.readFileSync(eventsPath, "utf8");
    for (const token of [
      "follow_added",
      "trial_started",
      "trial_converted",
      "subscription_cancelled",
    ]) {
      if (!eventsDoc.includes(token)) {
        warnings.push(`docs/EVENTS.md missing ${token}`);
      }
    }
  }

  const wiringChecks = [
    ["app/(app)/teams/[teamId]/page.tsx", "FollowToggle"],
    ["app/(app)/matches/[fixtureId]/page.tsx", "FavoriteMatchToggle"],
  ];

  for (const [file, symbol] of wiringChecks) {
    const full = path.join(root, file);
    if (
      fs.existsSync(full) &&
      !fs.readFileSync(full, "utf8").includes(symbol)
    ) {
      warnings.push(`${file} missing ${symbol} wiring`);
    }
  }

  if (warnings.length === 0) {
    console.log("✓ No obvious env or artifact issues");
    return;
  }

  for (const warning of warnings) {
    console.warn(`⚠ ${warning}`);
  }
}

checkEnvAndArtifacts();

run("Typecheck", "npm.cmd", ["run", "typecheck"]);
run("Lint", "npm.cmd", ["run", "lint"]);
run("Tests", "npm.cmd", ["run", "test:ci"]);
run("Phase 6 domain tests", "npm.cmd", [
  "run",
  "test:ci",
  "--",
  "lib/billing",
  "lib/entitlements",
  "lib/follow",
  "lib/notifications",
  "lib/sound",
  "lib/profile",
  "lib/ai/usage-gate.test.ts",
]);
run("Verify ingestion (UTC today)", "npm.cmd", ["run", "verify:ingestion"]);
run("Phase 6 webhook smoke", "npm.cmd", ["run", "phase6:webhook-smoke"]);
run("Phase 6 entitlements smoke", "npm.cmd", [
  "run",
  "phase6:entitlements-smoke",
]);

if (process.env.PHASE6_QA_USER_ID?.trim()) {
  run("Phase 6 follow smoke (PHASE6_QA_USER_ID)", "npm.cmd", [
    "run",
    "phase6:follow-smoke",
  ]);
} else {
  console.warn(
    "\n⚠ Skipping phase6:follow-smoke — set PHASE6_QA_USER_ID to run optional follow integration"
  );
}

run("Match page smoke (Phase 4 regression)", "npm.cmd", [
  "run",
  "phase4:match-smoke",
]);
run("Match page smoke (Phase 5 regression)", "npm.cmd", [
  "run",
  "phase5:match-smoke",
]);
run("Production build", "npm.cmd", ["run", "build"]);

console.log("\nPhase 6 automated checks passed.");
console.log(
  "Founder manual gate: docs/BILLING-E2E.md + ROADMAP.md §9 Definition of Done (manual)."
);
