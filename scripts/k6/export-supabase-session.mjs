#!/usr/bin/env node
/**
 * Build K6_AUTH_COOKIE from Playwright storage state (run e2e auth setup first).
 *
 *   npm run e2e:auth-setup
 *   node scripts/k6/export-supabase-session.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const authFile = path.join(root, "playwright", ".auth", "user.json");

if (!fs.existsSync(authFile)) {
  console.error(
    "Missing playwright/.auth/user.json — run: npx playwright test --project=setup"
  );
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(authFile, "utf8"));
const cookies = state.cookies ?? [];
if (cookies.length === 0) {
  console.error("No cookies in storage state — login may have failed.");
  process.exit(1);
}

const header = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
const outPath = path.join(root, ".k6-auth.env");
fs.writeFileSync(
  outPath,
  `# Generated — do not commit\nK6_AUTH_COOKIE=${header}\n`,
  "utf8"
);

console.log(
  `Wrote ${path.relative(root, outPath)} (${cookies.length} cookies).`
);
console.log("Run k6 with: npm run quality:k6");
