/**
 * Shared cron row picker for GitHub Actions ingestion workflows.
 * Usage: JOB_SET=ingestion|warm node scripts/pick-ingestion-gha-jobs.mjs
 * Writes `include=<json>` to GITHUB_OUTPUT when set.
 */
import fs from "node:fs";

const INGESTION_ROWS = [
  { id: "lineups", path: "/api/cron/sync-lineups", schedule: "*/15 * * * *" },
  {
    id: "sync-live-center",
    path: "/api/cron/sync-live-center",
    schedule: "*/15 * * * *",
  },
  {
    id: "sync-fixtures-today",
    path: "/api/cron/sync-fixtures-today",
    schedule: "*/15 * * * *",
  },
  {
    id: "reap-stale-locks",
    path: "/api/cron/reap-stale-locks",
    schedule: "*/5 * * * *",
  },
  {
    id: "reconcile-ai-usage",
    path: "/api/cron/reconcile-ai-usage",
    schedule: "*/5 * * * *",
  },
  {
    id: "standings",
    path: "/api/cron/sync-standings",
    schedule: "0 */6 * * *",
  },
  {
    id: "sync-fixtures-future",
    path: "/api/cron/sync-fixtures-future",
    schedule: "0 3 * * *",
  },
];

const WARM_ROWS = [
  {
    id: "warm-ai-prematch",
    path: "/api/cron/warm-ai-prematch?scope=imminent",
    schedule: "*/15 * * * *",
  },
  {
    id: "warm-ai-prematch-daily",
    path: "/api/cron/warm-ai-prematch?scope=daily",
    schedule: "0 */6 * * *",
  },
];

const LIVE_IDS = new Set([
  "sync-live-center",
  "sync-fixtures-today",
  "reap-stale-locks",
]);

const jobSet = process.env.JOB_SET;
const rows = jobSet === "warm" ? WARM_ROWS : INGESTION_ROWS;

const eventName = process.env.EVENT_NAME;
const schedule = process.env.EVENT_SCHEDULE;
const target = process.env.TARGET;

const picked = rows.filter((row) => {
  if (eventName === "schedule") {
    return row.schedule === schedule;
  }
  if (target === "both") {
    return true;
  }
  if (target === row.id) {
    return true;
  }
  if (target === "live" && jobSet === "ingestion") {
    return LIVE_IDS.has(row.id);
  }
  return false;
});

const payload = `include=${JSON.stringify(picked)}\n`;
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, payload);
} else {
  process.stdout.write(payload);
}
