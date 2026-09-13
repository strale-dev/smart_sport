import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { syncFixturesToday } from "@/lib/ingestion/sync-fixtures-today";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "sync-fixtures-today",
    run: syncFixturesToday,
  });
}
