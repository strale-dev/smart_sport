import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type VercelCronEntry = { path: string; schedule: string };

function loadVercelCrons(): VercelCronEntry[] {
  const vercelJsonPath = path.join(process.cwd(), "vercel.json");
  const raw = readFileSync(vercelJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { crons?: VercelCronEntry[] };
  return parsed.crons ?? [];
}

describe("vercel.json cron contract", () => {
  it("schedules sync-lineups every 15 minutes", () => {
    const crons = loadVercelCrons();
    const lineups = crons.find(
      (entry) => entry.path === "/api/cron/sync-lineups"
    );
    expect(lineups).toEqual({
      path: "/api/cron/sync-lineups",
      schedule: "*/15 * * * *",
    });
  });

  it("schedules sync-standings every 6 hours (ING-3 Pro cutover)", () => {
    const crons = loadVercelCrons();
    const standings = crons.find(
      (entry) => entry.path === "/api/cron/sync-standings"
    );
    expect(standings).toEqual({
      path: "/api/cron/sync-standings",
      schedule: "0 */6 * * *",
    });
  });
});
