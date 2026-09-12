import {
  hasApiFootballConfig,
  hasRedisConfig,
  isLivePollingEnabled,
} from "@/lib/env";
import { pingRedis } from "@/lib/redis/client";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

/** Use production URL only when explicitly set (e.g. smoke deployed env). */
const SITE = process.env.LIVE_SMOKE_BASE_URL?.trim() || "http://localhost:3000";

async function findLiveFixtureProviderId(): Promise<number | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("provider_id, status")
    .order("kickoff_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`fixtures query failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    if (
      row.provider_id != null &&
      isLiveFixtureStatus(
        row.status as Parameters<typeof isLiveFixtureStatus>[0]
      )
    ) {
      return row.provider_id;
    }
  }

  return null;
}

async function main() {
  console.log("Live polling smoke");
  console.log(`  LIVE_POLLING_ENABLED: ${isLivePollingEnabled()}`);
  console.log(`  Redis configured: ${hasRedisConfig(process.env)}`);
  console.log(
    `  API-Football configured: ${hasApiFootballConfig(process.env)}`
  );

  if (!isLivePollingEnabled()) {
    console.error("Set LIVE_POLLING_ENABLED=true in .env.local (and Vercel).");
    process.exit(1);
  }

  if (!hasRedisConfig(process.env)) {
    console.error("Missing UPSTASH_REDIS_REST_URL/TOKEN.");
    process.exit(1);
  }

  if (!(await pingRedis())) {
    console.error("Redis ping failed.");
    process.exit(1);
  }

  const liveId = await findLiveFixtureProviderId();
  if (liveId == null) {
    console.log(
      "No live fixture in Postgres right now — skipping /api/live/watch HTTP check."
    );
    console.log(
      "When a match is LIVE, re-run or open /live in the app (watch should return 200)."
    );
    return;
  }

  console.log(`Trying watch for live fixture provider_id=${liveId}...`);
  const res = await fetch(`${SITE}/api/live/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surface: "match",
      fixtureProviderId: liveId,
    }),
  });

  const body = (await res.json()) as Record<string, unknown>;
  console.log(`  HTTP ${res.status}`, body);

  if (!res.ok) {
    process.exit(1);
  }

  console.log("Live polling smoke passed (watch OK).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
