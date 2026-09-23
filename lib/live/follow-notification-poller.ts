import {
  FOLLOW_NOTIFICATION_MAX_CONCURRENT_POLLS,
  LIVE_DETECTOR_TICK_LOCK_SEC,
  LIVE_INTERNAL_FOLLOW_NOTIFICATION_POLL_TICK_PATH,
  LIVE_POLL_LOCK_TTL_SEC,
} from "@/lib/live/constants";
import { shouldContinueFollowNotificationPoll } from "@/lib/live/coordinator";
import { runFixtureLiveIngestAndPipeline } from "@/lib/live/fixture-live-ingest-pipeline";
import { isViewerPollActiveForFixture } from "@/lib/live/viewer-poll-active";
import { dispatchNotificationsFromLive } from "@/lib/notifications/dispatch-from-live";
import { listLiveFixtureProviderIdsWithTeamFollowers } from "@/lib/notifications/audience";
import { broadcastMatchUpdate } from "@/lib/live/broadcaster";
import { recordFollowPollTick } from "@/lib/live/poll-stats";
import { waitForCadence, writeLastPollAt } from "@/lib/live/poller";
import { parsePublicEnv, getCronSecret } from "@/lib/env";
import { getRedis } from "@/lib/redis/client";
import {
  liveFollowNotificationActiveSetKey,
  livePollFollowNotificationLastAtKey,
  lockFollowNotificationPollKey,
} from "@/lib/redis/keys";
import {
  acquireLock,
  isLockHeld,
  releaseLock,
  renewLock,
} from "@/lib/redis/lock";

const memoryFollowActiveFixtures = new Set<number>();

async function countActiveFollowNotificationPolls(): Promise<number> {
  const redis = getRedis();
  if (redis) {
    return redis.scard(liveFollowNotificationActiveSetKey());
  }
  return memoryFollowActiveFixtures.size;
}

async function markFollowNotificationPollActive(
  fixtureProviderId: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.sadd(liveFollowNotificationActiveSetKey(), fixtureProviderId);
    return;
  }
  memoryFollowActiveFixtures.add(fixtureProviderId);
}

async function unmarkFollowNotificationPollActive(
  fixtureProviderId: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.srem(liveFollowNotificationActiveSetKey(), fixtureProviderId);
    return;
  }
  memoryFollowActiveFixtures.delete(fixtureProviderId);
}

function buildInternalUrl(
  path: string,
  query?: Record<string, string>
): string {
  const { NEXT_PUBLIC_SITE_URL } = parsePublicEnv();
  const url = new URL(path, NEXT_PUBLIC_SITE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function internalAuthHeaders(): Record<string, string> {
  const secret = getCronSecret();
  if (!secret) {
    return {};
  }
  return { Authorization: `Bearer ${secret}` };
}

export function scheduleFollowNotificationPollTick(
  fixtureProviderId: number
): void {
  const url = buildInternalUrl(
    LIVE_INTERNAL_FOLLOW_NOTIFICATION_POLL_TICK_PATH,
    {
      fixtureProviderId: String(fixtureProviderId),
    }
  );

  void fetch(url, {
    method: "POST",
    headers: internalAuthHeaders(),
    cache: "no-store",
  }).catch((error) => {
    console.error("[live/follow-notification-poll] schedule failed", error);
  });
}

export async function seedFollowNotificationPolls(): Promise<{
  candidates: number;
  scheduled: number;
  skippedAtCap: number;
}> {
  const providerIds = await listLiveFixtureProviderIdsWithTeamFollowers();
  let scheduled = 0;
  let skippedAtCap = 0;

  for (const fixtureProviderId of providerIds) {
    if (!(await shouldContinueFollowNotificationPoll(fixtureProviderId))) {
      continue;
    }

    if (await isViewerPollActiveForFixture(fixtureProviderId)) {
      continue;
    }

    const lockKey = lockFollowNotificationPollKey(fixtureProviderId);
    if (await isLockHeld(lockKey)) {
      continue;
    }

    const active = await countActiveFollowNotificationPolls();
    if (active >= FOLLOW_NOTIFICATION_MAX_CONCURRENT_POLLS) {
      skippedAtCap += 1;
      continue;
    }

    const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
    if (!acquired) {
      continue;
    }

    await markFollowNotificationPollActive(fixtureProviderId);
    scheduleFollowNotificationPollTick(fixtureProviderId);
    scheduled += 1;
  }

  return {
    candidates: providerIds.length,
    scheduled,
    skippedAtCap,
  };
}

export type FollowNotificationPollTickResult = {
  ok: boolean;
  fixtureProviderId: number;
  skipped?: boolean;
  reason?: string;
};

export async function runFollowNotificationPollChainTick(
  fixtureProviderId: number
): Promise<FollowNotificationPollTickResult> {
  const lockKey = lockFollowNotificationPollKey(fixtureProviderId);
  const lockHeld = await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);

  if (!lockHeld && !(await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC))) {
    await recordFollowPollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "lock_not_held",
    };
  }

  await markFollowNotificationPollActive(fixtureProviderId);

  if (!(await shouldContinueFollowNotificationPoll(fixtureProviderId))) {
    await unmarkFollowNotificationPollActive(fixtureProviderId);
    await releaseLock(lockKey);
    await recordFollowPollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "not_live_or_not_followed",
    };
  }

  const lastAtKey = livePollFollowNotificationLastAtKey(fixtureProviderId);
  await waitForCadence(lastAtKey);

  if (!(await shouldContinueFollowNotificationPoll(fixtureProviderId))) {
    await unmarkFollowNotificationPollActive(fixtureProviderId);
    await releaseLock(lockKey);
    await recordFollowPollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "stopped_before_poll",
    };
  }

  if (await isViewerPollActiveForFixture(fixtureProviderId)) {
    await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
    scheduleFollowNotificationPollTick(fixtureProviderId);
    await recordFollowPollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "viewer_poll_active",
    };
  }

  const detectorLockKey = `lock:fixture:${fixtureProviderId}:follow-notify-detector`;
  const detectorLockAcquired = await acquireLock(
    detectorLockKey,
    LIVE_DETECTOR_TICK_LOCK_SEC
  );

  if (!detectorLockAcquired) {
    await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
    scheduleFollowNotificationPollTick(fixtureProviderId);
    await recordFollowPollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "detector_tick_lock_busy",
    };
  }

  let ingested = false;
  try {
    const tickResult = await runFixtureLiveIngestAndPipeline(fixtureProviderId);
    ingested = true;

    if (
      tickResult.changed &&
      tickResult.nextSnapshot &&
      tickResult.pipelineResult
    ) {
      await dispatchNotificationsFromLive({
        fixtureProviderId,
        prevSnapshot: tickResult.prevSnapshot,
        nextSnapshot: tickResult.nextSnapshot,
        pipelineResult: tickResult.pipelineResult,
      });

      if (tickResult.syncedAt) {
        await broadcastMatchUpdate(fixtureProviderId, tickResult.syncedAt, {
          meaningfulEvents: tickResult.meaningfulEvents,
          snapshot: tickResult.snapshot,
        });
      }
    }
  } finally {
    await releaseLock(detectorLockKey);
  }

  await writeLastPollAt(lastAtKey, Date.now());
  await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);

  if (await shouldContinueFollowNotificationPoll(fixtureProviderId)) {
    scheduleFollowNotificationPollTick(fixtureProviderId);
  } else {
    await unmarkFollowNotificationPollActive(fixtureProviderId);
    await releaseLock(lockKey);
  }

  await recordFollowPollTick({ ingested });
  return { ok: true, fixtureProviderId };
}

export function resetFollowNotificationPollerMemoryForTests(): void {
  memoryFollowActiveFixtures.clear();
}
