import type { NextRequest } from "next/server";

import { runCronRoute } from "@/lib/ingestion/cron-run";
import {
  warmAiPrematchInsights,
  type WarmAiPrematchScope,
} from "@/lib/ingestion/warm-ai-prematch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseWarmScope(request: NextRequest): WarmAiPrematchScope {
  const raw = request.nextUrl.searchParams.get("scope");
  if (raw === "imminent") {
    return "imminent";
  }
  if (raw === "backfill") {
    return "backfill";
  }
  return "daily";
}

export async function GET(request: NextRequest) {
  const scope = parseWarmScope(request);
  return runCronRoute(request, {
    jobName: `warm-ai-prematch:${scope}`,
    // maxDuration 60s + 30s buffer so a stuck run does not block the next GHA tick.
    lockTtlSeconds: 90,
    run: () => warmAiPrematchInsights(scope),
  });
}
