/**
 * Overwrites Vercel Production CRON_SECRET from local .env.local (via preload-env).
 * Does not print the secret. Requires Vercel CLI login (vercel link).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnvForScripts } from "../lib/env/load-local.ts";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
loadLocalEnvForScripts(rootDir);

const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("::error::CRON_SECRET missing in .env.local");
  process.exit(1);
}

function runVercel(args, input) {
  const result = spawnSync("npx", ["vercel", ...args], {
    cwd: rootDir,
    input,
    encoding: "utf8",
    shell: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Removing old Vercel Production CRON_SECRET (if any)…");
runVercel(["env", "rm", "CRON_SECRET", "production", "--yes"]);

console.log("Adding CRON_SECRET to Vercel Production from .env.local…");
runVercel(["env", "add", "CRON_SECRET", "production"], secret);

console.log(
  "Done. Redeploy Production (Vercel dashboard → Deployments → Redeploy) if cron still returns 401."
);
