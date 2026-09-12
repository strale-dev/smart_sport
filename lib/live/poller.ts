import {
  LIVE_DETECTOR_TICK_LOCK_SEC,
  LIVE_INTERNAL_POLL_CENTER_TICK_PATH,
  LIVE_INTERNAL_POLL_TICK_PATH,
  LIVE_POLL_LOCK_TTL_SEC,
  LIVE_SERVER_POLL_MAX_MS,
  LIVE_SERVER_POLL_MIN_MS,
} from "@/lib/live/constants";
import {
  buildLiveDetectorSnapshot,
  readDetectorSnapshot,
  writeDetectorSnapshot,
} from "@/lib/live/detector-snapshot";
import { runMeaningfulEventPipeline } from "@/lib/live/meaningful-event-pipeline";
import {
  shouldContinueFixturePoll,
  shouldContinueLiveCenterPoll,
} from "@/lib/live/coordinator";
import {
  broadcastLiveFeedUpdate,
  broadcastMatchUpdate,
} from "@/lib/live/broadcaster";
import { ingestLiveCenterTick } from "@/lib/live/ingest-live-center-tick";
import { ingestLiveFixtureTick } from "@/lib/live/ingest-live-tick";
import { parsePublicEnv, getCronSecret } from "@/lib/env";
import { getRedis } from "@/lib/redis/client";
import {
  liveDetectorLockKey,
  livePollFixtureLastAtKey,
  livePollLiveCenterLastAtKey,
  lockFixturePollKey,
  lockLiveCenterPollKey,
} from "@/lib/redis/keys";
import { acquireLock, releaseLock, renewLock } from "@/lib/redis/lock";

const memoryLastPollAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomPollIntervalMs(): number {
  const span = LIVE_SERVER_POLL_MAX_MS - LIVE_SERVER_POLL_MIN_MS;
  return LIVE_SERVER_POLL_MIN_MS + Math.floor(Math.random() * (span + 1));
}

async function readLastPollAt(key: string): Promise<number | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<number | string>(key);
    if (raw == null) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return memoryLastPollAt.get(key) ?? null;
}

async function writeLastPollAt(
  key: string,
  timestampMs: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, timestampMs, { ex: 86_400 });
    return;
  }

  memoryLastPollAt.set(key, timestampMs);
}

export async function waitForCadence(lastAtKey: string): Promise<void> {
  const targetIntervalMs = randomPollIntervalMs();
  const lastAt = await readLastPollAt(lastAtKey);
  if (lastAt == null) {
    return;
  }

  const elapsed = Date.now() - lastAt;
  const waitMs = Math.max(0, targetIntervalMs - elapsed);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
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

export function scheduleMatchPollTick(fixtureProviderId: number): void {
  const url = buildInternalUrl(LIVE_INTERNAL_POLL_TICK_PATH, {
    fixtureProviderId: String(fixtureProviderId),
  });

  void fetch(url, {
    method: "POST",
    headers: internalAuthHeaders(),
    cache: "no-store",
  }).catch((error) => {
    console.error("[live/poll-tick] schedule failed", error);
  });
}

export function scheduleLiveCenterPollTick(): void {
  const url = buildInternalUrl(LIVE_INTERNAL_POLL_CENTER_TICK_PATH);

  void fetch(url, {
    method: "POST",
    headers: internalAuthHeaders(),
    cache: "no-store",
  }).catch((error) => {
    console.error("[live/poll-center-tick] schedule failed", error);
  });
}

async function ensureLockHeld(lockKey: string): Promise<boolean> {
  const renewed = await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
  if (renewed) {
    return true;
  }

  return acquireLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
}

export type FixturePollTickResult = {
  ok: boolean;
  fixtureProviderId: number;
  skipped?: boolean;
  reason?: string;
};

export async function runFixturePollChainTick(
  fixtureProviderId: number
): Promise<FixturePollTickResult> {
  const lockKey = lockFixturePollKey(fixtureProviderId);
  const lockHeld = await ensureLockHeld(lockKey);

  if (!lockHeld) {
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "lock_not_held",
    };
  }

  if (!(await shouldContinueFixturePoll(fixtureProviderId))) {
    await releaseLock(lockKey);
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "no_viewers_or_not_live",
    };
  }

  const lastAtKey = livePollFixtureLastAtKey(fixtureProviderId);
  await waitForCadence(lastAtKey);

  if (!(await shouldContinueFixturePoll(fixtureProviderId))) {
    await releaseLock(lockKey);
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "stopped_before_poll",
    };
  }

  const detectorLockKey = liveDetectorLockKey(fixtureProviderId);
  const detectorLockAcquired = await acquireLock(
    detectorLockKey,
    LIVE_DETECTOR_TICK_LOCK_SEC
  );

  if (!detectorLockAcquired) {
    await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);
    if (await shouldContinueFixturePoll(fixtureProviderId)) {
      scheduleMatchPollTick(fixtureProviderId);
    } else {
      await releaseLock(lockKey);
    }
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "detector_tick_lock_busy",
    };
  }

  try {
    const prevSnapshot = await readDetectorSnapshot(fixtureProviderId);
    const ingestResult = await ingestLiveFixtureTick(fixtureProviderId);

    if (ingestResult.ok) {
      const syncedAt = new Date().toISOString();
      const nextSnapshot = await buildLiveDetectorSnapshot(fixtureProviderId);

      if (nextSnapshot) {
        const pipelineResult = await runMeaningfulEventPipeline({
          fixtureProviderId,
          prevSnapshot,
          nextSnapshot,
        });

        if (pipelineResult.detectResult.scoreGoalMismatch) {
          console.warn(
            JSON.stringify({
              scope: "live/meaningful-event-detector",
              level: "warn",
              message: "score_goal_event_count_mismatch",
              fixtureProviderId,
              mismatch: pipelineResult.detectResult.scoreGoalMismatch,
              prevScore: prevSnapshot?.score ?? null,
              nextScore: nextSnapshot.score,
            })
          );
        }

        if (pipelineResult.broadcastEvents.length > 0) {
          console.info(
            JSON.stringify({
              scope: "live/meaningful-event-detector",
              level: "info",
              message: "meaningful_events_detected",
              fixtureProviderId,
              events: pipelineResult.broadcastEvents,
              livePredictionUpdated: pipelineResult.livePredictionUpdated,
              liveInsightGenerated: pipelineResult.liveInsightGenerated,
            })
          );
        }

        await writeDetectorSnapshot(nextSnapshot);

        const meaningfulEvents =
          pipelineResult.broadcastEvents.length > 0
            ? pipelineResult.broadcastEvents
            : undefined;

        await broadcastMatchUpdate(
          fixtureProviderId,
          syncedAt,
          meaningfulEvents
        );
      } else {
        await broadcastMatchUpdate(fixtureProviderId, syncedAt);
      }
    }

    await writeLastPollAt(lastAtKey, Date.now());
  } finally {
    await releaseLock(detectorLockKey);
  }

  await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);

  if (await shouldContinueFixturePoll(fixtureProviderId)) {
    scheduleMatchPollTick(fixtureProviderId);
  } else {
    await releaseLock(lockKey);
  }

  return { ok: true, fixtureProviderId };
}

export type LiveCenterPollTickResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

export async function runLiveCenterPollChainTick(): Promise<LiveCenterPollTickResult> {
  const lockKey = lockLiveCenterPollKey();
  const lockHeld = await ensureLockHeld(lockKey);

  if (!lockHeld) {
    return { ok: true, skipped: true, reason: "lock_not_held" };
  }

  if (!(await shouldContinueLiveCenterPoll())) {
    await releaseLock(lockKey);
    return { ok: true, skipped: true, reason: "no_viewers" };
  }

  const lastAtKey = livePollLiveCenterLastAtKey();
  await waitForCadence(lastAtKey);

  if (!(await shouldContinueLiveCenterPoll())) {
    await releaseLock(lockKey);
    return { ok: true, skipped: true, reason: "stopped_before_poll" };
  }

  const ingestResult = await ingestLiveCenterTick();
  if (ingestResult.ok) {
    await broadcastLiveFeedUpdate(new Date().toISOString(), "live-center");
  }
  await writeLastPollAt(lastAtKey, Date.now());
  await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);

  if (await shouldContinueLiveCenterPoll()) {
    scheduleLiveCenterPollTick();
  } else {
    await releaseLock(lockKey);
  }

  return { ok: true };
}

export function resetLivePollerMemoryForTests(): void {
  memoryLastPollAt.clear();
}
