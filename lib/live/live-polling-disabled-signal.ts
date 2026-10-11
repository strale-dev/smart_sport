import { isLivePollingEnabled } from "@/lib/env";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { createAdminClient } from "@/lib/supabase/admin";

export async function emitLivePollingDisabledWhenLiveFixturesExist(input: {
  jobName: string;
  env?: Record<string, string | undefined>;
}): Promise<{ emitted: boolean; liveFixtureCount: number }> {
  const env = input.env ?? process.env;
  if (isLivePollingEnabled(env)) {
    return { emitted: false, liveFixtureCount: 0 };
  }

  const client = createAdminClient();
  const { count, error } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("is_live", true);

  if (error) {
    throw new Error(
      `Failed to count live fixtures for polling signal: ${error.message}`
    );
  }

  const liveFixtureCount = count ?? 0;
  if (liveFixtureCount <= 0) {
    return { emitted: false, liveFixtureCount: 0 };
  }

  logIngestionEvent({
    job_name: input.jobName,
    stage: "live_polling_check",
    error_type: "live_polling_disabled",
    ok: false,
    detail: { liveFixtureCount },
  });

  return { emitted: true, liveFixtureCount };
}
