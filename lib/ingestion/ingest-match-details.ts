import {
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import { optionalProviderFetch } from "@/lib/api-football/safe-call";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { ingestFixtureSidelinedFromProvider } from "@/lib/ingestion/ingest-sidelined";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertFixtureEvents,
  upsertFixtureStatistics,
  upsertPlayerMatchPerformances,
} from "@/lib/ingestion/match-details-upsert";
import { writeCachedValue } from "@/lib/redis/cache";
import {
  CACHE_TTL,
  providerFixtureEventsKey,
  providerFixturePlayersKey,
  providerFixtureStatsKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestMatchDetailsOptions = {
  /** Overview hydrate skips lineups — lineups tab owns that flow for now. */
  skipLineups?: boolean;
};

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
  fixtureProviderId: number,
  options: IngestMatchDetailsOptions = {}
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
  let eventsCount = 0;
  let statisticsCount = 0;
  let playerPerformancesCount = 0;
  let lineupsCount = 0;

  await throttleProviderRequest();
  const eventsResult = await optionalProviderFetch(
    `fixture ${fixtureProviderId} events`,
    () => getFixtureEventsEndpoint(fixtureProviderId)
  );
  apiRequests += 1;

  if (eventsResult.ok) {
    eventsCount = await upsertFixtureEvents(
      client,
      fixtureId,
      eventsResult.value
    );
    await writeCachedValue(
      providerFixtureEventsKey(fixtureProviderId),
      eventsResult.value,
      CACHE_TTL.fixtureEventsStale
    );
  }

  await throttleProviderRequest();
  const statisticsResult = await optionalProviderFetch(
    `fixture ${fixtureProviderId} statistics`,
    () => getFixtureStatisticsEndpoint(fixtureProviderId)
  );
  apiRequests += 1;

  if (statisticsResult.ok) {
    statisticsCount = await upsertFixtureStatistics(
      client,
      fixtureId,
      statisticsResult.value
    );
    await writeCachedValue(
      providerFixtureStatsKey(fixtureProviderId),
      statisticsResult.value,
      CACHE_TTL.fixtureStatsStale
    );
  }

  if (!options.skipLineups) {
    try {
      const lineupsResult = await ingestLineupsFromProvider(fixtureProviderId);
      apiRequests += lineupsResult.stats.apiRequests;
      lineupsCount = lineupsResult.stats.lineups;
    } catch (error) {
      console.warn(
        `[ingest] lineups skipped for fixture ${fixtureProviderId}`,
        error
      );
    }
  }

  await throttleProviderRequest();
  const playersResult = await optionalProviderFetch(
    `fixture ${fixtureProviderId} players`,
    () => getFixturePlayersEndpoint(fixtureProviderId)
  );
  apiRequests += 1;

  if (playersResult.ok) {
    playerPerformancesCount = await upsertPlayerMatchPerformances(
      client,
      fixtureId,
      playersResult.value
    );
    await writeCachedValue(
      providerFixturePlayersKey(fixtureProviderId),
      playersResult.value,
      CACHE_TTL.fixtureStatsStale
    );
  }

  const anyProviderOk =
    eventsResult.ok || statisticsResult.ok || playersResult.ok;

  return {
    ok: anyProviderOk,
    fixtureProviderId,
    stats: {
      events: eventsCount,
      statistics: statisticsCount,
      lineups: lineupsCount,
      playerPerformances: playerPerformancesCount,
      apiRequests,
    },
    reason: anyProviderOk
      ? undefined
      : [
          !eventsResult.ok ? eventsResult.reason : null,
          !statisticsResult.ok ? statisticsResult.reason : null,
          !playersResult.ok ? playersResult.reason : null,
        ]
          .filter(Boolean)
          .join(" | "),
  };
}

export async function ingestFixturePlayerPerformancesFromProvider(
  fixtureProviderId: number
): Promise<{ ok: boolean; playerPerformances: number; reason?: string }> {
  const client = createAdminClient();
  const fixtureId = await getFixtureUuidByProviderId(client, fixtureProviderId);

  if (!fixtureId) {
    return {
      ok: false,
      playerPerformances: 0,
      reason: "Fixture not found in Postgres",
    };
  }

  await throttleProviderRequest();
  const playersResult = await optionalProviderFetch(
    `fixture ${fixtureProviderId} players`,
    () => getFixturePlayersEndpoint(fixtureProviderId)
  );

  if (!playersResult.ok) {
    return {
      ok: false,
      playerPerformances: 0,
      reason: playersResult.reason,
    };
  }

  const playerPerformancesCount = await upsertPlayerMatchPerformances(
    client,
    fixtureId,
    playersResult.value
  );

  await writeCachedValue(
    providerFixturePlayersKey(fixtureProviderId),
    playersResult.value,
    CACHE_TTL.fixtureStatsStale
  );

  return { ok: true, playerPerformances: playerPerformancesCount };
}
