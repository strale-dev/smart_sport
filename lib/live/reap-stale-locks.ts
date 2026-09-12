import { isLivePollingEnabled } from "@/lib/env";
import {
  listReapMatchFixtureIds,
  shouldContinueFixturePoll,
  shouldContinueLiveCenterPoll,
} from "@/lib/live/coordinator";
import {
  scheduleLiveCenterPollTick,
  scheduleMatchPollTick,
} from "@/lib/live/poller";
import { acquireLock, releaseLock } from "@/lib/redis/lock";
import { lockFixturePollKey, lockLiveCenterPollKey } from "@/lib/redis/keys";
import { LIVE_POLL_LOCK_TTL_SEC } from "@/lib/live/constants";
import {
  countLiveCenterWatchers,
  countMatchWatchers,
  shouldKeepLiveCenterPollRunning,
  shouldKeepMatchPollRunning,
} from "@/lib/live/viewers";

export type ReapStaleLocksResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  reason?: string;
  stats: {
    matchRestarted: number;
    matchLocksReleased: number;
    liveCenterRestarted: number;
    liveCenterLockReleased: number;
  };
};

export async function reapStaleLiveLocks(): Promise<ReapStaleLocksResult> {
  const stats = {
    matchRestarted: 0,
    matchLocksReleased: 0,
    liveCenterRestarted: 0,
    liveCenterLockReleased: 0,
  };

  if (!isLivePollingEnabled()) {
    return {
      ok: true,
      job: "reap-stale-locks",
      skipped: true,
      reason: "live_polling_disabled",
      stats,
    };
  }

  const fixtureIds = await listReapMatchFixtureIds();

  for (const fixtureProviderId of fixtureIds) {
    const shouldRun = await shouldContinueFixturePoll(fixtureProviderId);
    const lockKey = lockFixturePollKey(fixtureProviderId);

    if (shouldRun) {
      const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
      if (acquired) {
        scheduleMatchPollTick(fixtureProviderId);
        stats.matchRestarted += 1;
      }
      continue;
    }

    const keepPoll = await shouldKeepMatchPollRunning(fixtureProviderId);
    if (!keepPoll) {
      const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
      if (acquired) {
        await releaseLock(lockKey);
        stats.matchLocksReleased += 1;
      }
    }
  }

  const liveCenterShouldRun = await shouldContinueLiveCenterPoll();
  const liveCenterLockKey = lockLiveCenterPollKey();

  if (liveCenterShouldRun) {
    const acquired = await acquireLock(
      liveCenterLockKey,
      LIVE_POLL_LOCK_TTL_SEC
    );
    if (acquired) {
      scheduleLiveCenterPollTick();
      stats.liveCenterRestarted += 1;
    }
  } else {
    const keepPoll = await shouldKeepLiveCenterPollRunning();
    const watchers = await countLiveCenterWatchers();
    if (!keepPoll && watchers === 0) {
      const acquired = await acquireLock(
        liveCenterLockKey,
        LIVE_POLL_LOCK_TTL_SEC
      );
      if (acquired) {
        await releaseLock(liveCenterLockKey);
        stats.liveCenterLockReleased += 1;
      }
    }
  }

  for (const fixtureProviderId of fixtureIds) {
    const watchers = await countMatchWatchers(fixtureProviderId);
    if (
      watchers === 0 &&
      !(await shouldKeepMatchPollRunning(fixtureProviderId))
    ) {
      const lockKey = lockFixturePollKey(fixtureProviderId);
      const acquired = await acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
      if (acquired) {
        await releaseLock(lockKey);
      }
    }
  }

  return {
    ok: true,
    job: "reap-stale-locks",
    stats,
  };
}
