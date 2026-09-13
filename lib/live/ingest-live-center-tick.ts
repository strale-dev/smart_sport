import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import { isLivePollingEnabled } from "@/lib/env";
import { cronIngestBudgetExceeded } from "@/lib/ingestion/cron-budget";
import {
  getIngestionConfig,
  isLeagueInAllowlist,
} from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { getRedis } from "@/lib/redis/client";
import { CACHE_TTL, providerFixturesLiveKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

export type IngestLiveCenterTickResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  stats?: {
    apiRequests: number;
    fixturesUpserted: number;
    fixturesFilteredOut: number;
    fixturesRemaining?: number;
    stoppedForTimeBudget?: boolean;
  };
};

export async function ingestLiveCenterTick(): Promise<IngestLiveCenterTickResult> {
  if (!isLivePollingEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: "live_polling_disabled",
    };
  }

  const config = getIngestionConfig();
  const client = createAdminClient();
  const syncedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  await throttleProviderRequest();
  const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { live: "all" },
    { priority: "critical" }
  );
  const apiRequests = 1;

  const allowlisted = rawFixtures.filter((raw) =>
    isLeagueInAllowlist(raw.league.id, config)
  );
  const fixturesFilteredOut = rawFixtures.length - allowlisted.length;
  const domainFixtures: Fixture[] = [];
  let stoppedForTimeBudget = false;

  for (const raw of allowlisted) {
    if (cronIngestBudgetExceeded(startedAtMs)) {
      stoppedForTimeBudget = true;
      break;
    }

    const { domain } = await ingestFixtureFromRaw(client, raw, syncedAt);
    domainFixtures.push(domain);
  }

  const redis = getRedis();
  if (redis && domainFixtures.length > 0) {
    await redis.set(
      providerFixturesLiveKey(),
      { value: domainFixtures, cachedAt: syncedAt },
      { ex: CACHE_TTL.fixturesLiveFresh }
    );
  }

  return {
    ok: true,
    stats: {
      apiRequests,
      fixturesUpserted: domainFixtures.length,
      fixturesFilteredOut,
      ...(stoppedForTimeBudget
        ? {
            fixturesRemaining: allowlisted.length - domainFixtures.length,
            stoppedForTimeBudget: true,
          }
        : {}),
    },
  };
}
