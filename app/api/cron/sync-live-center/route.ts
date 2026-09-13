import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { ingestLiveCenterTick } from "@/lib/live/ingest-live-center-tick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-live-center",
    run: async () => {
      const result = await ingestLiveCenterTick();
      return {
        ok: result.ok,
        job: "sync-live-center",
        skipped: result.skipped,
        reason: result.reason,
        stats: result.stats,
      };
    },
  });
}
