import type { NextRequest } from "next/server";

import { cleanupAiUsageRows } from "@/lib/entitlements/cleanup-ai-usage";
import { runCronRoute } from "@/lib/ingestion/cron-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "cleanup-ai-usage",
    lockTtlSeconds: 300,
    run: async () => {
      const stats = await cleanupAiUsageRows();
      return {
        ok: true,
        job: "cleanup-ai-usage",
        stats,
      };
    },
  });
}
