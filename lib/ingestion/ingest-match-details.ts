import {
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureLineups as getFixtureLineupsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertFixtureEvents,
  upsertFixtureStatistics,
  upsertLineups,
  upsertPlayerMatchPerformances,
} from "@/lib/ingestion/match-details-upsert";
import { getRedis } from "@/lib/redis/client";
import {
  providerFixtureEventsKey,
  providerFixtureLineupsKey,
  providerFixturePlayersKey,
  providerFixtureStatsKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestMatchDetailsResult = {
  ok: boolean;
  fixtureProviderId: number;
  stats: {
    events: number;
    statistics: number;
    lineups: number;
    playerPerformances: number;
    apiRequests: number;
  };
  reason?: string;
};

export async function ingestMatchDetailsFromProvider(
  fixtureProviderId: number
): Promise<IngestMatchDetailsResult> {
  const client = createAdminClient();
  const fixtureId = await getFixtureUuidByProviderId(client, fixtureProviderId);

  if (!fixtureId) {
    return {
      ok: false,
      fixtureProviderId,
      stats: {
        events: 0,
        statistics: 0,
        lineups: 0,
        playerPerformances: 0,
        apiRequests: 0,
      },
      reason: "Fixture not found in Postgres",
    };
  }

  let apiRequests = 0;

  await throttleProviderRequest();
  const events = await getFixtureEventsEndpoint(fixtureProviderId);
  apiRequests += 1;

  await throttleProviderRequest();
  const statistics = await getFixtureStatisticsEndpoint(fixtureProviderId);
  apiRequests += 1;

  await throttleProviderRequest();
  const lineups = await getFixtureLineupsEndpoint(fixtureProviderId);
  apiRequests += 1;

  await throttleProviderRequest();
  const playerPerformances = await getFixturePlayersEndpoint(fixtureProviderId);
  apiRequests += 1;

  const eventsCount = await upsertFixtureEvents(client, fixtureId, events);
  const statisticsCount = await upsertFixtureStatistics(
    client,
    fixtureId,
    statistics
  );
  const lineupsCount = await upsertLineups(client, fixtureId, lineups);
  const playerPerformancesCount = await upsertPlayerMatchPerformances(
    client,
    fixtureId,
    playerPerformances
  );

  const syncedAt = new Date().toISOString();
  const redis = getRedis();

  if (redis) {
    await Promise.all([
      redis.set(
        providerFixtureEventsKey(fixtureProviderId),
        { value: events, cachedAt: syncedAt },
        { ex: 86_400 }
      ),
      redis.set(
        providerFixtureStatsKey(fixtureProviderId),
        { value: statistics, cachedAt: syncedAt },
        { ex: 86_400 }
      ),
      redis.set(
        providerFixtureLineupsKey(fixtureProviderId),
        { value: lineups, cachedAt: syncedAt },
        { ex: 86_400 }
      ),
      redis.set(
        providerFixturePlayersKey(fixtureProviderId),
        { value: playerPerformances, cachedAt: syncedAt },
        { ex: 86_400 }
      ),
    ]);
  }

  return {
    ok: true,
    fixtureProviderId,
    stats: {
      events: eventsCount,
      statistics: statisticsCount,
      lineups: lineupsCount,
      playerPerformances: playerPerformancesCount,
      apiRequests,
    },
  };
}
