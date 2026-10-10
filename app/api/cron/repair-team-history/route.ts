import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { runTeamHistoryRepairBatch } from "@/lib/ingestion/repair-team-history";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "repair-team-history",
    run: async () => {
      const result = await runTeamHistoryRepairBatch();
      return {
        ok: result.ok,
        job: "repair-team-history",
        degraded: result.degraded,
        stats: {
          teamsProcessed: result.teamsProcessed,
          teamsSkipped: result.teamsSkipped,
          apiRequests: result.apiRequests,
          fixturesUpserted: result.fixturesUpserted,
          candidateCount: result.candidateCount,
          ...(result.stoppedForTimeBudget
            ? { stoppedForTimeBudget: true }
            : {}),
        },
      };
    },
  });
}
