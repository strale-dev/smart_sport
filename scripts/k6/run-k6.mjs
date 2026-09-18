#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const authEnv = path.join(root, ".k6-auth.env");
const extraEnv = { ...process.env };

if (fs.existsSync(authEnv)) {
  for (const line of fs.readFileSync(authEnv, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) {
      extraEnv[m[1]] = m[2];
    }
  }
} else {
  console.warn(
    "⚠ .k6-auth.env missing — run: npm run e2e:auth-setup && node scripts/k6/export-supabase-session.mjs"
  );
}

const script = path.join(root, "scripts", "k6", "match-and-dashboard.js");
const result = spawnSync("k6", ["run", script], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: extraEnv,
});

process.exit(result.status ?? 1);
