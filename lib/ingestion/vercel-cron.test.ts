import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  VERCEL_CRON_HOBBY_SCHEDULES,
  VERCEL_CRON_PRO_TARGETS,
} from "@/lib/ingestion/vercel-cron-contract";

type VercelCronEntry = { path: string; schedule: string };

function loadVercelCrons(): VercelCronEntry[] {
  const vercelJsonPath = path.join(process.cwd(), "vercel.json");
  const raw = readFileSync(vercelJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { crons?: VercelCronEntry[] };
  return parsed.crons ?? [];
}

/** Hobby deploy gate — must match scripts/validate-vercel-cron-hobby.mjs */
function runsMoreThanOncePerDay(schedule: string): boolean {
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

describe("vercel.json cron contract", () => {
  it("uses Hobby-safe schedules so Production deploys succeed", () => {
    const crons = loadVercelCrons();
    for (const entry of crons) {
      expect(
        runsMoreThanOncePerDay(entry.schedule),
        `${entry.path} schedule ${entry.schedule} would block Vercel Hobby deploys`
      ).toBe(false);
    }
  });

  it("matches documented daily Vercel cron paths", () => {
    const crons = loadVercelCrons();
    for (const [cronPath, schedule] of Object.entries(
      VERCEL_CRON_HOBBY_SCHEDULES
    )) {
      expect(crons).toContainEqual({ path: cronPath, schedule });
    }
  });

  it("documents Pro cutover targets separately from vercel.json", () => {
    expect(VERCEL_CRON_PRO_TARGETS["/api/cron/sync-standings"]).toBe(
      "0 */6 * * *"
    );
    expect(VERCEL_CRON_PRO_TARGETS["/api/cron/sync-lineups"]).toBe(
      "*/15 * * * *"
    );
  });
});
