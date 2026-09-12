import {
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
  getFixtureByIdWithRaw,
} from "@/lib/api-football/endpoints/fixtures";
import { isLivePollingEnabled } from "@/lib/env";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertFixtureEvents,
  upsertFixtureStatistics,
} from "@/lib/ingestion/match-details-upsert";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { getRedis } from "@/lib/redis/client";
import {
  CACHE_TTL,
  fixtureFreshTtlSeconds,
  providerFixtureEventsKey,
  providerFixtureKey,
  providerFixtureStatsKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestLiveFixtureTickResult = {
  ok: boolean;
  fixtureProviderId: number;
  skipped?: boolean;
  reason?: string;
  stats?: {
    events: number;
    statistics: number;
    apiRequests: number;
  };
};

export async function ingestLiveFixtureTick(
  fixtureProviderId: number
): Promise<IngestLiveFixtureTickResult> {
  if (!isLivePollingEnabled()) {
    return {
      ok: false,
      fixtureProviderId,
      skipped: true,
      reason: "live_polling_disabled",
    };
  }

  const client = createAdminClient();
  let apiRequests = 0;

  await throttleProviderRequest();
  const fixturePayload = await getFixtureByIdWithRaw(fixtureProviderId);
  apiRequests += 1;

  if (!fixturePayload) {
    return {
      ok: false,
      fixtureProviderId,
      reason: "fixture_not_found",
      stats: { events: 0, statistics: 0, apiRequests },
    };
  }

  const syncedAt = new Date().toISOString();
  await ingestFixtureFromRaw(client, fixturePayload.raw, syncedAt);

  const fixtureUuid = await getFixtureUuidByProviderId(
    client,
    fixtureProviderId
  );

  if (!fixtureUuid) {
    return {
      ok: false,
      fixtureProviderId,
      reason: "fixture_uuid_missing",
      stats: { events: 0, statistics: 0, apiRequests },
    };
  }

  await throttleProviderRequest();
  const events = await getFixtureEventsEndpoint(fixtureProviderId);
  apiRequests += 1;

  await throttleProviderRequest();
  const statistics = await getFixtureStatisticsEndpoint(fixtureProviderId);
  apiRequests += 1;

  const eventsCount = await upsertFixtureEvents(client, fixtureUuid, events);
  const statisticsCount = await upsertFixtureStatistics(
    client,
    fixtureUuid,
    statistics
  );

  const redis = getRedis();
  const domain = fixturePayload.domain;
  const fixtureTtl = fixtureFreshTtlSeconds(domain.status);

  if (redis) {
    await Promise.all([
      redis.set(
        providerFixtureKey(fixtureProviderId),
        { value: domain, cachedAt: syncedAt },
        { ex: fixtureTtl }
      ),
      redis.set(
        providerFixtureEventsKey(fixtureProviderId),
        { value: events, cachedAt: syncedAt },
        { ex: CACHE_TTL.fixtureEventsFresh }
      ),
      redis.set(
        providerFixtureStatsKey(fixtureProviderId),
        { value: statistics, cachedAt: syncedAt },
        { ex: CACHE_TTL.fixtureStatsFresh }
      ),
    ]);
  }

  return {
    ok: true,
    fixtureProviderId,
    stats: {
      events: eventsCount,
      statistics: statisticsCount,
      apiRequests,
    },
  };
}
