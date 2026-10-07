/**
 * Watchdog + manual recovery: run the same Production crons as the 15-min GHA tick,
 * sequentially (matches ingestion matrix max-parallel: 1).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const triggerScript = path.join(__dirname, "trigger-production-cron.mjs");

const PATHS = [
  "/api/cron/sync-lineups",
  "/api/cron/sync-live-center",
  "/api/cron/sync-fixtures-today",
  "/api/cron/warm-ai-prematch?scope=imminent",
];

function runTrigger(cronPath) {
  const result = spawnSync(process.execPath, [triggerScript, cronPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`::error::Batch stopped after failure on ${cronPath}`);
    process.exit(result.status ?? 1);
  }
}

for (const cronPath of PATHS) {
  runTrigger(cronPath);
}
