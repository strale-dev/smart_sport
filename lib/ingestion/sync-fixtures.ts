import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  buildFixtureDateWindow,
  getIngestionConfig,
  isLeagueInAllowlist,
  isTodayOrTomorrowUtc,
} from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  countAllowlistFixturesForUtcDate,
  ingestFixtureFromRaw,
} from "@/lib/ingestion/upsert";
import { getRedis } from "@/lib/redis/client";
import { providerFixturesDateKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

export type SyncFixturesResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  reason?: string;
  stats: {
    datesRequested: number;
    datesSkipped: number;
    apiRequests: number;
    fixturesUpserted: number;
    fixturesFilteredOut: number;
  };
};

async function shouldSkipDateSync(
  date: string,
  leagueProviderIds: readonly number[]
): Promise<boolean> {
  if (isTodayOrTomorrowUtc(date)) {
    return false;
  }

  const client = createAdminClient();
  const counts = await countAllowlistFixturesForUtcDate(
    client,
    date,
    leagueProviderIds
  );

  if (counts.total === 0) {
    return false;
  }

  return (
    counts.total === counts.terminal && counts.syncedToday === counts.total
  );
}

export async function syncFixtures(
  anchor = new Date()
): Promise<SyncFixturesResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const dates = buildFixtureDateWindow(anchor, config.fixtureWindowDays);
  const syncedAt = anchor.toISOString();

  let datesSkipped = 0;
  let apiRequests = 0;
  let fixturesUpserted = 0;
  let fixturesFilteredOut = 0;

  for (const date of dates) {
    if (await shouldSkipDateSync(date, config.leagueProviderIds)) {
      datesSkipped += 1;
      continue;
    }

    if (apiRequests > 0) {
      await throttleProviderRequest();
    }

    const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
      "/fixtures",
      { date }
    );
    apiRequests += 1;

    const allowlisted = rawFixtures.filter((raw) =>
      isLeagueInAllowlist(raw.league.id, config)
    );
    fixturesFilteredOut += rawFixtures.length - allowlisted.length;

    const domainFixtures: Fixture[] = [];

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
  }

  return {
    ok: true,
    job: "sync-fixtures",
    stats: {
      datesRequested: dates.length,
      datesSkipped,
      apiRequests,
      fixturesUpserted,
      fixturesFilteredOut,
    },
  };
}
