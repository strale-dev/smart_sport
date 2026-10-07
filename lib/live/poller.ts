import {
  LIVE_DETECTOR_TICK_LOCK_SEC,
  LIVE_INTERNAL_POLL_CENTER_TICK_PATH,
  LIVE_INTERNAL_POLL_TICK_PATH,
  LIVE_POLL_LOCK_TTL_SEC,
  LIVE_SERVER_POLL_MAX_MS,
  LIVE_SERVER_POLL_MIN_MS,
} from "@/lib/live/constants";
import { runFixtureLiveIngestAndPipeline } from "@/lib/live/fixture-live-ingest-pipeline";
import { dispatchNotificationsFromLive } from "@/lib/notifications/dispatch-from-live";
import {
  shouldContinueFixturePoll,
  shouldContinueLiveCenterPoll,
} from "@/lib/live/coordinator";
import {
  broadcastLiveFeedUpdate,
  broadcastMatchUpdate,
} from "@/lib/live/broadcaster";
import { ingestLiveCenterTick } from "@/lib/live/ingest-live-center-tick";
import { parsePublicEnv, getCronSecret } from "@/lib/env";
import { getRedis } from "@/lib/redis/client";
import {
  liveDetectorLockKey,
  livePollFixtureLastAtKey,
  livePollLiveCenterLastAtKey,
  lockFixturePollKey,
  lockLiveCenterPollKey,
} from "@/lib/redis/keys";
import {
  recordCenterPollTick,
  recordFixturePollTick,
} from "@/lib/live/poll-stats";
import { getStoredQuotaSnapshot } from "@/lib/api-football/quota";
import { acquireLock, releaseLock, renewLock } from "@/lib/redis/lock";

const LIVE_LOW_BUDGET_POLL_INTERVAL_FACTOR = 1.25;

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

export async function writeLastPollAt(
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

export async function waitForCadence(
  lastAtKey: string,
  intervalFactor = 1
): Promise<void> {
  let targetIntervalMs = randomPollIntervalMs();
  const quota = await getStoredQuotaSnapshot();
  if (quota.isLowBudget) {
    targetIntervalMs = Math.round(
      targetIntervalMs * LIVE_LOW_BUDGET_POLL_INTERVAL_FACTOR
    );
  }
  if (intervalFactor > 1) {
    targetIntervalMs = Math.round(targetIntervalMs * intervalFactor);
  }
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
    await recordFixturePollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "lock_not_held",
    };
  }

  if (!(await shouldContinueFixturePoll(fixtureProviderId))) {
    await releaseLock(lockKey);
    await recordFixturePollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "no_viewers_or_not_live",
    };
  }

  const lastAtKey = livePollFixtureLastAtKey(fixtureProviderId);
  let pollIntervalFactor = 1;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { isPausedLiveFixtureStatus } =
      await import("@/lib/fixtures/live-status");
    const client = createAdminClient();
    const { data: fixtureRow } = await client
      .from("fixtures")
      .select("status")
      .eq("provider_id", fixtureProviderId)
      .maybeSingle();
    if (
      fixtureRow?.status &&
      isPausedLiveFixtureStatus(
        fixtureRow.status as import("@/types/domain").FixtureStatus
      )
    ) {
      const { PAUSED_LIVE_POLL_INTERVAL_FACTOR } =
        await import("@/lib/fixtures/live-status");
      pollIntervalFactor = PAUSED_LIVE_POLL_INTERVAL_FACTOR;
    }
  } catch {
    pollIntervalFactor = 1;
  }
  await waitForCadence(lastAtKey, pollIntervalFactor);

  if (!(await shouldContinueFixturePoll(fixtureProviderId))) {
    await releaseLock(lockKey);
    await recordFixturePollTick({ skipped: true });
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
    await recordFixturePollTick({ skipped: true });
    return {
      ok: true,
      fixtureProviderId,
      skipped: true,
      reason: "detector_tick_lock_busy",
    };
  }

  let ingested = false;
  try {
    try {
      const tickResult =
        await runFixtureLiveIngestAndPipeline(fixtureProviderId);
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
      }

      if (tickResult.changed && tickResult.syncedAt) {
        await broadcastMatchUpdate(fixtureProviderId, tickResult.syncedAt, {
          meaningfulEvents: tickResult.meaningfulEvents,
          snapshot: tickResult.snapshot,
        });
      } else if (
        tickResult.syncedAt &&
        tickResult.pipelineResult?.liveInsightGenerated
      ) {
        await broadcastMatchUpdate(fixtureProviderId, tickResult.syncedAt, {
          liveInsightGenerated: true,
        });
      }

      await writeLastPollAt(lastAtKey, Date.now());
    } catch (error) {
      console.error(
        `[live/poll-tick] fixture ${fixtureProviderId} tick failed`,
        error
      );
    }
  } finally {
    await releaseLock(detectorLockKey);
  }

  await renewLock(lockKey, LIVE_POLL_LOCK_TTL_SEC);

  if (await shouldContinueFixturePoll(fixtureProviderId)) {
    scheduleMatchPollTick(fixtureProviderId);
  } else {
    await releaseLock(lockKey);
  }

  await recordFixturePollTick({ ingested });
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
    await recordCenterPollTick({ skipped: true });
    return { ok: true, skipped: true, reason: "lock_not_held" };
  }

  if (!(await shouldContinueLiveCenterPoll())) {
    await releaseLock(lockKey);
    await recordCenterPollTick({ skipped: true });
    return { ok: true, skipped: true, reason: "no_viewers" };
  }

  const lastAtKey = livePollLiveCenterLastAtKey();
  await waitForCadence(lastAtKey);

  if (!(await shouldContinueLiveCenterPoll())) {
    await releaseLock(lockKey);
    await recordCenterPollTick({ skipped: true });
    return { ok: true, skipped: true, reason: "stopped_before_poll" };
  }

  const ingestResult = await ingestLiveCenterTick();
  const ingested = Boolean(ingestResult.ok && !ingestResult.skipped);
  if (ingestResult.ok) {
    await broadcastLiveFeedUpdate(new Date().toISOString(), "live-center");
  }
  await recordCenterPollTick({
    ingested,
    skipped: ingestResult.skipped,
    apiRequests: ingestResult.stats?.apiRequests,
    fixturesUpserted: ingestResult.stats?.fixturesUpserted,
  });
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
