import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { syncFixtures } from "@/lib/ingestion/sync-fixtures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-fixtures",
    run: syncFixtures,
  });
}
