import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { refreshAnalytics } from "@/lib/ingestion/refresh-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "refresh-analytics",
    run: refreshAnalytics,
  });
}
