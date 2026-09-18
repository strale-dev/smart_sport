import { mapFixtureLiveClockFromRaw } from "@/lib/api-football/adapter";
import {
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
  getFixtureByIdWithRaw,
} from "@/lib/api-football/endpoints/fixtures";
import {
  diffAuthoritativeState,
  type AuthoritativeLiveState,
} from "@/lib/live/authoritative-fingerprint";
import { buildMatchLiveSnapshot } from "@/lib/live/build-match-snapshot";
import { logFixtureStatusTransition } from "@/lib/live/fixture-status-log";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { isLivePollingEnabled } from "@/lib/env";
import {
  readFixtureByProviderIdFromDb,
  readFixtureEventsFromDb,
  readFixtureStatisticsFromDb,
} from "@/lib/ingestion/db-read";
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
import type { Fixture } from "@/types/domain";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestLiveFixtureTickResult = {
  ok: boolean;
  fixtureProviderId: number;
  changed?: boolean;
  syncedAt?: string;
  snapshot?: MatchLiveSnapshot;
  skipped?: boolean;
  reason?: string;
  stats?: {
    events: number;
    statistics: number;
    apiRequests: number;
  };
};

async function readCurrentAuthoritativeState(
  fixtureProviderId: number
): Promise<AuthoritativeLiveState | null> {
  const [fixture, events, statistics] = await Promise.all([
    readFixtureByProviderIdFromDb(fixtureProviderId),
    readFixtureEventsFromDb(fixtureProviderId),
    readFixtureStatisticsFromDb(fixtureProviderId),
  ]);

  if (!fixture) {
    return null;
  }

  return { fixture, events, statistics };
}

async function writeProviderCaches(
  fixtureProviderId: number,
  state: AuthoritativeLiveState,
  syncedAt: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const fixtureTtl = fixtureFreshTtlSeconds(state.fixture.status);

  await Promise.all([
    redis.set(
      providerFixtureKey(fixtureProviderId),
      { value: state.fixture, cachedAt: syncedAt },
      { ex: fixtureTtl }
    ),
    redis.set(
      providerFixtureEventsKey(fixtureProviderId),
      { value: state.events, cachedAt: syncedAt },
      { ex: CACHE_TTL.fixtureEventsFresh }
    ),
    redis.set(
      providerFixtureStatsKey(fixtureProviderId),
      { value: state.statistics, cachedAt: syncedAt },
      { ex: CACHE_TTL.fixtureStatsFresh }
    ),
  ]);
}

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

  await throttleProviderRequest();
  const events = await getFixtureEventsEndpoint(fixtureProviderId);
  apiRequests += 1;

  await throttleProviderRequest();
  const statistics = await getFixtureStatisticsEndpoint(fixtureProviderId);
  apiRequests += 1;

  const syncedAt = new Date().toISOString();
  const nextFixture: Fixture = {
    ...fixturePayload.domain,
    liveClock: mapFixtureLiveClockFromRaw(fixturePayload.raw, syncedAt),
  };

  const nextState: AuthoritativeLiveState = {
    fixture: nextFixture,
    events,
    statistics,
  };

  const previousState = await readCurrentAuthoritativeState(fixtureProviderId);
  const changeFlags = diffAuthoritativeState(previousState, nextState);

  if (!changeFlags.any) {
    return {
      ok: true,
      fixtureProviderId,
      changed: false,
      syncedAt,
      snapshot: buildMatchLiveSnapshot(nextState),
      stats: { events: 0, statistics: 0, apiRequests },
    };
  }

  if (changeFlags.fixture) {
    const oldStatus = previousState?.fixture.status ?? null;
    await ingestFixtureFromRaw(client, fixturePayload.raw, syncedAt);
    if (oldStatus !== nextFixture.status) {
      logFixtureStatusTransition({
        fixtureProviderId,
        oldStatus,
        newStatus: nextFixture.status,
        score: `${nextFixture.score.home ?? 0}-${nextFixture.score.away ?? 0}`,
        source: "ingest-live-tick",
        timestamp: syncedAt,
      });
    }
  }

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

  let eventsCount = 0;
  let statisticsCount = 0;

  if (changeFlags.events) {
    eventsCount = await upsertFixtureEvents(client, fixtureUuid, events);
  }

  if (changeFlags.statistics) {
    statisticsCount = await upsertFixtureStatistics(
      client,
      fixtureUuid,
      statistics
    );
  }

  await writeProviderCaches(fixtureProviderId, nextState, syncedAt);

  return {
    ok: true,
    fixtureProviderId,
    changed: true,
    syncedAt,
    snapshot: buildMatchLiveSnapshot(nextState),
    stats: {
      events: eventsCount,
      statistics: statisticsCount,
      apiRequests,
    },
  };
}
