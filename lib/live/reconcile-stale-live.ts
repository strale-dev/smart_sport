import { getFixtureByIdWithRaw } from "@/lib/api-football/endpoints/fixtures";
import { readLiveFixturesFromDb } from "@/lib/ingestion/db-read";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import {
  broadcastLiveFeedUpdate,
  broadcastMatchUpdate,
} from "@/lib/live/broadcaster";
import { buildMatchLiveSnapshot } from "@/lib/live/build-match-snapshot";
import { logFixtureStatusTransition } from "@/lib/live/fixture-status-log";
import { ingestLiveFixtureTick } from "@/lib/live/ingest-live-tick";
import {
  isProviderSyncStale,
  isWithinLiveTailPollWindow,
  LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS,
} from "@/lib/live/live-presentation";
import { isLivePollingEnabled } from "@/lib/env";
import { getRedis } from "@/lib/redis/client";
import {
  CACHE_TTL,
  isLiveFixtureStatus,
  providerFixturesLiveKey,
} from "@/lib/redis/keys";
import { finalizeExpiredStaleLiveFixturesInDb } from "@/lib/live/finalize-expired-stale-live";
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import type { Fixture } from "@/types/domain";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReconcileStaleLiveResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  stats: {
    dbLiveCount: number;
    candidates: number;
    revalidated: number;
    finalized: number;
    errors: number;
    apiRequests: number;
  };
};

function formatScore(fixture: Fixture): string {
  return `${fixture.score.home ?? 0}-${fixture.score.away ?? 0}`;
}

/** Exported for tests — empty active set means "no provider signal", not "zero live fixtures". */
export function shouldRevalidateBecauseAbsentFromActiveLiveSet(
  providerId: number,
  activeLiveProviderIds: Set<number> | undefined
): boolean {
  if (!activeLiveProviderIds || activeLiveProviderIds.size === 0) {
    return false;
  }
  return !activeLiveProviderIds.has(providerId);
}

function needsRevalidation(
  fixture: Fixture,
  activeLiveProviderIds: Set<number> | undefined,
  nowMs: number
): boolean {
  if (!isLiveFixtureStatus(fixture.status)) {
    return false;
  }

  const providerId = fixture.externalId;

  if (
    shouldRevalidateBecauseAbsentFromActiveLiveSet(
      providerId,
      activeLiveProviderIds
    )
  ) {
    return true;
  }

  const lastSync = fixture.liveClock?.lastProviderSyncAt;

  if (isProviderSyncStale(lastSync, nowMs)) {
    return true;
  }

  if (!isWithinLiveTailPollWindow(fixture.kickoffAt, nowMs)) {
    return true;
  }

  return false;
}

async function refreshLiveListCache(fixtures: Fixture[], syncedAt: string) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const liveOnly = filterAllowlistedFixtures(fixtures).filter((fixture) =>
    isLiveFixtureStatus(fixture.status)
  );

  await redis.set(
    providerFixturesLiveKey(),
    { value: liveOnly, cachedAt: syncedAt },
    { ex: CACHE_TTL.fixturesLiveFresh }
  );
}

export async function reconcileStaleLiveFixtures(options?: {
  activeLiveProviderIds?: number[];
  maxRevalidations?: number;
  source?: string;
}): Promise<ReconcileStaleLiveResult> {
  const stats = {
    dbLiveCount: 0,
    candidates: 0,
    revalidated: 0,
    finalized: 0,
    errors: 0,
    apiRequests: 0,
  };

  if (!isLivePollingEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: "live_polling_disabled",
      stats,
    };
  }

  const nowMs = Date.now();
  const source = options?.source ?? "reconcile-stale-live";
  const maxRevalidations = options?.maxRevalidations ?? 12;
  const activeSet = options?.activeLiveProviderIds
    ? new Set(options.activeLiveProviderIds)
    : undefined;

  const dbLive = await readLiveFixturesFromDb();
  stats.dbLiveCount = dbLive.length;

  const candidates = dbLive.filter((fixture) =>
    needsRevalidation(fixture, activeSet, nowMs)
  );
  stats.candidates = candidates.length;

  const toProcess = candidates.slice(0, maxRevalidations);

  for (const fixture of toProcess) {
    const fixtureProviderId = fixture.externalId;
    const oldStatus = fixture.status;

    try {
      if (isLivePollingEnabled()) {
        await throttleProviderRequest();
        const tick = await ingestLiveFixtureTick(fixtureProviderId);
        stats.apiRequests += tick.stats?.apiRequests ?? 0;

        if (tick.ok && tick.changed && tick.syncedAt) {
          stats.revalidated += 1;
          const nextStatus = tick.snapshot?.fixture.status ?? oldStatus;
          logFixtureStatusTransition({
            fixtureProviderId,
            oldStatus,
            newStatus: nextStatus,
            score: tick.snapshot
              ? formatScore(tick.snapshot.fixture)
              : formatScore(fixture),
            source,
          });

          if (!isLiveFixtureStatus(nextStatus)) {
            stats.finalized += 1;
          }

          if (tick.snapshot) {
            await broadcastMatchUpdate(fixtureProviderId, tick.syncedAt, {
              snapshot: tick.snapshot,
            });
          }
          continue;
        }
      }

      await throttleProviderRequest();
      const payload = await getFixtureByIdWithRaw(fixtureProviderId);
      stats.apiRequests += 1;

      if (!payload) {
        stats.errors += 1;
        continue;
      }

      const syncedAt = new Date().toISOString();
      const client = createAdminClient();
      const { domain } = await ingestFixtureFromRaw(
        client,
        payload.raw,
        syncedAt
      );
      stats.revalidated += 1;

      logFixtureStatusTransition({
        fixtureProviderId,
        oldStatus,
        newStatus: domain.status,
        score: formatScore(domain),
        source: `${source}:fixture-by-id`,
      });

      if (!isLiveFixtureStatus(domain.status)) {
        stats.finalized += 1;
        const snapshot = buildMatchLiveSnapshot({
          fixture: domain,
          events: [],
          statistics: [],
        });
        await broadcastMatchUpdate(fixtureProviderId, syncedAt, { snapshot });
      }
    } catch (error) {
      stats.errors += 1;
      console.error(
        `[live/reconcile] fixture ${fixtureProviderId} revalidation failed`,
        error
      );
    }
  }

  const stillLive = await readLiveFixturesFromDb();
  const expiredTail = stillLive.filter(
    (fixture) =>
      isLiveFixtureStatus(fixture.status) &&
      !isWithinLiveTailPollWindow(fixture.kickoffAt, nowMs)
  );

  for (const fixture of expiredTail.slice(0, maxRevalidations)) {
    if (stats.apiRequests >= maxRevalidations * 3) {
      break;
    }

    try {
      await throttleProviderRequest();
      const payload = await getFixtureByIdWithRaw(fixture.externalId);
      stats.apiRequests += 1;
      if (!payload) {
        continue;
      }

      const syncedAt = new Date().toISOString();
      const client = createAdminClient();
      const oldStatus = fixture.status;
      const { domain } = await ingestFixtureFromRaw(
        client,
        payload.raw,
        syncedAt
      );

      logFixtureStatusTransition({
        fixtureProviderId: fixture.externalId,
        oldStatus,
        newStatus: domain.status,
        score: formatScore(domain),
        source: `${source}:expired-tail`,
      });

      if (!isLiveFixtureStatus(domain.status)) {
        stats.finalized += 1;
      }
      stats.revalidated += 1;
    } catch (error) {
      stats.errors += 1;
      console.error(
        `[live/reconcile] expired-tail fixture ${fixture.externalId}`,
        error
      );
    }
  }

  const refreshedLive = await readLiveFixturesFromDb();
  await refreshLiveListCache(refreshedLive, new Date().toISOString());

  const finalizeResult = await finalizeExpiredStaleLiveFixturesInDb();
  if (finalizeResult.finalized > 0) {
    stats.finalized = (stats.finalized ?? 0) + finalizeResult.finalized;
  }

  if (stats.finalized > 0 || stats.revalidated > 0) {
    await broadcastLiveFeedUpdate(new Date().toISOString(), "live-center");
  }

  return { ok: true, stats };
}

export { LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS };
