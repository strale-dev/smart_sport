import { readFileSync } from "node:fs";
import path from "node:path";

const vercelJsonPath = path.join(process.cwd(), "vercel.json");
const raw = readFileSync(vercelJsonPath, "utf8");
const { crons = [] } = JSON.parse(raw);

/** Returns true if a standard 5-field cron can fire more than once per UTC day (Hobby disallowed). */
function runsMoreThanOncePerDay(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    return true;
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.includes("/") || minute === "*") {
    return true;
  }
  if (hour.includes("/") || hour === "*") {
    return true;
  }
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return false;
  }
  if (dayOfMonth !== "*" || month !== "*" || dayOfWeek !== "*") {
    return false;
  }
  return true;
}

const offenders = crons.filter((entry) =>
  runsMoreThanOncePerDay(entry.schedule)
);

if (offenders.length > 0) {
  console.error(
    "vercel.json cron jobs must run at most once per day on Vercel Hobby (deploy will fail otherwise):\n"
  );
  for (const entry of offenders) {
    console.error(`  ${entry.path} → ${entry.schedule}`);
  }
  console.error(
    "\nUse daily schedules in vercel.json and sub-daily triggers via .github/workflows/ingestion-schedule.yml until Pro cutover."
  );
  process.exit(1);
}

console.log("vercel.json cron schedules are Hobby-compatible.");
