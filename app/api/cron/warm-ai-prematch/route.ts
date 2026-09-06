import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import { warmAiPrematchInsights } from "@/lib/ingestion/warm-ai-prematch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "warm-ai-prematch",
    lockTtlSeconds: 600,
    run: warmAiPrematchInsights,
  });
}
