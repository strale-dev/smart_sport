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
import {
  reconcileStaleLiveFixtures,
  type ReconcileStaleLiveResult,
} from "@/lib/live/reconcile-stale-live";
import { getRedis } from "@/lib/redis/client";
import {
  CACHE_TTL,
  isLiveFixtureStatus,
  providerFixturesLiveKey,
} from "@/lib/redis/keys";
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
    fixtureErrors?: number;
    lastFixtureError?: string;
    reconcile?: ReconcileStaleLiveResult["stats"];
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

  await throttleProviderRequest();
  const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { live: "all" },
    { priority: "critical" }
  );
  const upsertStartedAtMs = Date.now();
  const apiRequests = 1;

  const allowlisted = rawFixtures.filter((raw) =>
    isLeagueInAllowlist(raw.league.id, config)
  );
  const activeLiveProviderIds = allowlisted.map((raw) => raw.fixture.id);
  const fixturesFilteredOut = rawFixtures.length - allowlisted.length;
  const domainFixtures: Fixture[] = [];
  let stoppedForTimeBudget = false;
  let fixtureErrors = 0;
  let lastFixtureError: string | undefined;

  for (const raw of allowlisted) {
    if (cronIngestBudgetExceeded(upsertStartedAtMs)) {
      stoppedForTimeBudget = true;
      break;
    }

    try {
      const { domain } = await ingestFixtureFromRaw(client, raw, syncedAt);
      domainFixtures.push(domain);
    } catch (error) {
      fixtureErrors += 1;
      if (!lastFixtureError) {
        lastFixtureError =
          error instanceof Error ? error.message : "Unknown upsert error";
      }
      console.error(`[sync-live-center] fixture ${raw.fixture.id}`, error);
    }
  }

  const redis = getRedis();
  if (redis && domainFixtures.length > 0) {
    try {
      const liveOnly = domainFixtures.filter((fixture) =>
        isLiveFixtureStatus(fixture.status)
      );
      await redis.set(
        providerFixturesLiveKey(),
        { value: liveOnly, cachedAt: syncedAt },
        { ex: CACHE_TTL.fixturesLiveFresh }
      );
    } catch (error) {
      console.error("[sync-live-center] redis cache write failed", error);
    }
  }

  const fixturesUpserted = domainFixtures.length;
  const ok =
    allowlisted.length === 0 || fixturesUpserted > 0 || stoppedForTimeBudget;

  const reconcileResult = await reconcileStaleLiveFixtures({
    activeLiveProviderIds,
    source: "sync-live-center",
  });

  return {
    ok,
    stats: {
      apiRequests,
      fixturesUpserted,
      fixturesFilteredOut,
      reconcile: reconcileResult.stats,
      ...(stoppedForTimeBudget
        ? {
            fixturesRemaining: allowlisted.length - fixturesUpserted,
            stoppedForTimeBudget: true,
          }
        : {}),
      ...(fixtureErrors > 0 ? { fixtureErrors } : {}),
      ...(lastFixtureError ? { lastFixtureError } : {}),
    },
  };
}
