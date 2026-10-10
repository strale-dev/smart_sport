import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { syncFixturesFuture } from "@/lib/ingestion/sync-fixtures-future";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-fixtures-future",
    lockTtlSeconds: 600,
    run: syncFixturesFuture,
  });
}
