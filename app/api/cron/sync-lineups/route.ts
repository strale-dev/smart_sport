import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { syncLineups } from "@/lib/ingestion/sync-lineups";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-lineups",
    run: syncLineups,
  });
}
