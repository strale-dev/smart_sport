import type { NextRequest } from "next/server";

import { sendTrialEndingReminders } from "@/lib/emails/send-trial-ending-reminders";
import { runCronRoute } from "@/lib/ingestion/cron-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronRoute(request, {
    jobName: "send-trial-ending-emails",
    lockTtlSeconds: 300,
    run: async () => {
      const stats = await sendTrialEndingReminders();
      return {
        ok: true,
        job: "send-trial-ending-emails",
        stats,
      };
    },
  });
}
