import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  getIngestionConfig,
  isLeagueInAllowlist,
} from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { getRedis } from "@/lib/redis/client";
import { providerFixturesDateKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

export type SyncFixturesTodayResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  reason?: string;
  stats: {
    date: string;
    apiRequests: number;
    fixturesUpserted: number;
    fixturesFilteredOut: number;
  };
};

export async function syncFixturesToday(
  anchor = new Date()
): Promise<SyncFixturesTodayResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const date = anchor.toISOString().slice(0, 10);
  const syncedAt = anchor.toISOString();

  await throttleProviderRequest();
  const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { date }
  );

  const allowlisted = rawFixtures.filter((raw) =>
    isLeagueInAllowlist(raw.league.id, config)
  );
  const fixturesFilteredOut = rawFixtures.length - allowlisted.length;
  const domainFixtures: Fixture[] = [];
  let fixturesUpserted = 0;

  for (const raw of allowlisted) {
    const { domain } = await ingestFixtureFromRaw(client, raw, syncedAt);
    domainFixtures.push(domain);
    fixturesUpserted += 1;
  }

  const redis = getRedis();
  if (redis && domainFixtures.length > 0) {
    await redis.set(
      providerFixturesDateKey(date),
      {
        value: domainFixtures,
        cachedAt: syncedAt,
      },
      { ex: 86_400 }
    );
  }

  return {
    ok: true,
    job: "sync-fixtures-today",
    stats: {
      date,
      apiRequests: 1,
      fixturesUpserted,
      fixturesFilteredOut,
    },
  };
}
