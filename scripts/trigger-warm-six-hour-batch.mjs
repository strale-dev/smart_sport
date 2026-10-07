/**
 * Run daily warm then backfill sequentially so they do not fight for overlapping work
 * or leave a long-lived lock that skips the daily scope on the next tick.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const triggerScript = path.join(__dirname, "trigger-production-cron.mjs");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runTrigger(cronPath) {
  const result = spawnSync(process.execPath, [triggerScript, cronPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`::error::Six-hour warm batch stopped on ${cronPath}`);
    process.exit(result.status ?? 1);
  }
}

async function main() {
  runTrigger("/api/cron/warm-ai-prematch?scope=daily");
  await sleep(5_000);
  runTrigger("/api/cron/warm-ai-prematch?scope=backfill");
}

await main();
