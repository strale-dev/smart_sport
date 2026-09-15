import type { NextRequest } from "next/server";

import { reconcileAiUsage } from "@/lib/entitlements/reconcile-ai-usage";
import { runCronRoute } from "@/lib/ingestion/cron-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "reconcile-ai-usage",
    lockTtlSeconds: 240,
    run: async () => {
      const stats = await reconcileAiUsage();
      return {
        ok: true,
        job: "reconcile-ai-usage",
        stats,
      };
    },
  });
}
