import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import { cronIngestBudgetExceeded } from "@/lib/ingestion/cron-budget";
import {
  getIngestionConfig,
  isLeagueInAllowlist,
  isTerminalFixtureStatus,
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
    fixturesRemaining?: number;
    stoppedForTimeBudget?: boolean;
    fixtureErrors?: number;
  };
};

const LIVE_FIXTURE_STATUSES = new Set([
  "1H",
  "2H",
  "HT",
  "ET",
  "BT",
  "P",
  "LIVE",
  "INT",
]);

function fixtureTodaySyncPriority(raw: RawApiFootballFixture): number {
  const status = raw.fixture.status.short;
  if (LIVE_FIXTURE_STATUSES.has(status)) {
    return 0;
  }
  if (!isTerminalFixtureStatus(status)) {
    return 1;
  }
  return 2;
}

export async function syncFixturesToday(
  anchor = new Date()
): Promise<SyncFixturesTodayResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const date = anchor.toISOString().slice(0, 10);
  const syncedAt = anchor.toISOString();
  const startedAtMs = Date.now();

  await throttleProviderRequest();
  const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { date }
  );

  const allowlisted = rawFixtures
    .filter((raw) => isLeagueInAllowlist(raw.league.id, config))
    .sort((a, b) => fixtureTodaySyncPriority(a) - fixtureTodaySyncPriority(b));
  const fixturesFilteredOut = rawFixtures.length - allowlisted.length;
  const domainFixtures: Fixture[] = [];
  let fixturesUpserted = 0;
  let fixtureErrors = 0;
  let stoppedForTimeBudget = false;

  for (const raw of allowlisted) {
    if (cronIngestBudgetExceeded(startedAtMs)) {
      stoppedForTimeBudget = true;
      break;
    }

    try {
      const { domain } = await ingestFixtureFromRaw(client, raw, syncedAt);
      domainFixtures.push(domain);
      fixturesUpserted += 1;
    } catch (error) {
      fixtureErrors += 1;
      console.error(`[sync-fixtures-today] fixture ${raw.fixture.id}`, error);
    }
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

  const ok =
    allowlisted.length === 0 ||
    fixturesUpserted > 0 ||
    (fixtureErrors === 0 && !stoppedForTimeBudget);

  return {
    ok,
    job: "sync-fixtures-today",
    stats: {
      date,
      apiRequests: 1,
      fixturesUpserted,
      fixturesFilteredOut,
      ...(stoppedForTimeBudget
        ? {
            fixturesRemaining: allowlisted.length - fixturesUpserted,
            stoppedForTimeBudget: true,
          }
        : {}),
      ...(fixtureErrors > 0 ? { fixtureErrors } : {}),
    },
  };
}
