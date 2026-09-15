import { randomUUID } from "node:crypto";

import type { LiveWatchSurface } from "@/lib/live/constants";
import {
  LIVE_PRESENCE_GRACE_MS,
  LIVE_WATCH_TOKEN_TTL_SEC,
} from "@/lib/live/constants";
import { getRedis } from "@/lib/redis/client";
import {
  liveActiveMatchWatchesKey,
  liveGraceLiveCenterKey,
  liveGraceMatchKey,
  liveWatchTokenKey,
  liveWatchersLiveCenterKey,
  liveWatchersMatchKey,
} from "@/lib/redis/keys";
import { releaseLiveMatchView } from "@/lib/entitlements/live-view-gate";
import { renewActiveLiveWatchForUser } from "@/lib/entitlements/live-active-watches";
import { createAdminClient } from "@/lib/supabase/admin";

export type LiveWatchRegistration = {
  surface: LiveWatchSurface;
  fixtureProviderId?: number;
  userId?: string;
};

export type RegisterWatchResult = {
  watchToken: string;
  expiresInSec: number;
};

type WatchRecord = LiveWatchRegistration & {
  expiresAt: number;
};

const memoryTokens = new Map<string, WatchRecord>();
const memoryMatchWatchers = new Map<number, Set<string>>();
const memoryLiveCenterWatchers = new Set<string>();
const memoryGraceMatch = new Map<number, number>();
let memoryGraceLiveCenter: number | null = null;

function pruneMemoryToken(token: string, now = Date.now()): WatchRecord | null {
  const record = memoryTokens.get(token);
  if (!record) {
    return null;
  }
  if (record.expiresAt <= now) {
    memoryTokens.delete(token);
    return null;
  }
  return record;
}

function memoryMatchCount(fixtureProviderId: number, now = Date.now()): number {
  const set = memoryMatchWatchers.get(fixtureProviderId);
  if (!set) {
    return 0;
  }
  let count = 0;
  for (const token of set) {
    if (pruneMemoryToken(token, now)) {
      count += 1;
    } else {
      set.delete(token);
    }
  }
  return count;
}

function memoryLiveCenterCount(now = Date.now()): number {
  let count = 0;
  for (const token of memoryLiveCenterWatchers) {
    if (pruneMemoryToken(token, now)) {
      count += 1;
    } else {
      memoryLiveCenterWatchers.delete(token);
    }
  }
  return count;
}

async function syncMatchActiveViewers(
  fixtureProviderId: number,
  count: number
): Promise<void> {
  try {
    const client = createAdminClient();
    await client
      .from("fixtures")
      .update({ active_viewers: count })
      .eq("provider_id", fixtureProviderId);
  } catch {
    // Best-effort counter for reap cron / analytics.
  }
}

export async function registerLiveWatch(
  registration: LiveWatchRegistration
): Promise<RegisterWatchResult> {
  if (
    registration.surface === "match" &&
    registration.fixtureProviderId == null
  ) {
    throw new Error("fixtureProviderId is required for match surface.");
  }

  const watchToken = randomUUID();
  const redis = getRedis();

  if (redis) {
    await redis.set(liveWatchTokenKey(watchToken), registration, {
      ex: LIVE_WATCH_TOKEN_TTL_SEC,
    });

    if (registration.surface === "match") {
      const fixtureProviderId = registration.fixtureProviderId!;
      await redis.sadd(liveWatchersMatchKey(fixtureProviderId), watchToken);
      await redis.sadd(liveActiveMatchWatchesKey(), String(fixtureProviderId));
      await redis.del(liveGraceMatchKey(fixtureProviderId));
      const count = await redis.scard(liveWatchersMatchKey(fixtureProviderId));
      await syncMatchActiveViewers(fixtureProviderId, count);
    } else {
      await redis.sadd(liveWatchersLiveCenterKey(), watchToken);
      await redis.del(liveGraceLiveCenterKey());
    }
  } else {
    const expiresAt = Date.now() + LIVE_WATCH_TOKEN_TTL_SEC * 1000;
    memoryTokens.set(watchToken, { ...registration, expiresAt });

    if (registration.surface === "match") {
      const fixtureProviderId = registration.fixtureProviderId!;
      let set = memoryMatchWatchers.get(fixtureProviderId);
      if (!set) {
        set = new Set();
        memoryMatchWatchers.set(fixtureProviderId, set);
      }
      set.add(watchToken);
      memoryGraceMatch.delete(fixtureProviderId);
      await syncMatchActiveViewers(
        fixtureProviderId,
        memoryMatchCount(fixtureProviderId)
      );
    } else {
      memoryLiveCenterWatchers.add(watchToken);
      memoryGraceLiveCenter = null;
    }
  }

  return { watchToken, expiresInSec: LIVE_WATCH_TOKEN_TTL_SEC };
}

export async function heartbeatLiveWatch(watchToken: string): Promise<boolean> {
  const redis = getRedis();

  if (redis) {
    const record = await redis.get<LiveWatchRegistration>(
      liveWatchTokenKey(watchToken)
    );
    if (!record) {
      return false;
    }

    await redis.expire(liveWatchTokenKey(watchToken), LIVE_WATCH_TOKEN_TTL_SEC);
    if (record.userId && record.surface === "match") {
      await renewActiveLiveWatchForUser(record.userId);
    }
    return true;
  }

  const record = pruneMemoryToken(watchToken);
  if (!record) {
    return false;
  }

  record.expiresAt = Date.now() + LIVE_WATCH_TOKEN_TTL_SEC * 1000;
  memoryTokens.set(watchToken, record);
  return true;
}

async function startGraceForMatch(fixtureProviderId: number): Promise<void> {
  const redis = getRedis();
  const startedAt = String(Date.now());

  if (redis) {
    await redis.set(liveGraceMatchKey(fixtureProviderId), startedAt, {
      ex: Math.ceil(LIVE_PRESENCE_GRACE_MS / 1000) + 30,
    });
    return;
  }

  memoryGraceMatch.set(fixtureProviderId, Date.now());
}

async function startGraceForLiveCenter(): Promise<void> {
  const redis = getRedis();
  const startedAt = String(Date.now());

  if (redis) {
    await redis.set(liveGraceLiveCenterKey(), startedAt, {
      ex: Math.ceil(LIVE_PRESENCE_GRACE_MS / 1000) + 30,
    });
    return;
  }

  memoryGraceLiveCenter = Date.now();
}

export async function unregisterLiveWatch(watchToken: string): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const record = await redis.get<LiveWatchRegistration>(
      liveWatchTokenKey(watchToken)
    );
    await redis.del(liveWatchTokenKey(watchToken));

    if (!record) {
      return;
    }

    if (record.surface === "match" && record.fixtureProviderId != null) {
      const fixtureProviderId = record.fixtureProviderId;
      await redis.srem(liveWatchersMatchKey(fixtureProviderId), watchToken);
      const count = await redis.scard(liveWatchersMatchKey(fixtureProviderId));
      await syncMatchActiveViewers(fixtureProviderId, count);
      if (record.userId) {
        await releaseLiveMatchView(record.userId, fixtureProviderId);
      }
      if (count === 0) {
        await startGraceForMatch(fixtureProviderId);
      }
    } else if (record.surface === "live-center") {
      await redis.srem(liveWatchersLiveCenterKey(), watchToken);
      const count = await redis.scard(liveWatchersLiveCenterKey());
      if (count === 0) {
        await startGraceForLiveCenter();
      }
    }

    return;
  }

  const record = memoryTokens.get(watchToken);
  memoryTokens.delete(watchToken);
  if (!record) {
    return;
  }

  if (record.surface === "match" && record.fixtureProviderId != null) {
    const fixtureProviderId = record.fixtureProviderId;
    memoryMatchWatchers.get(fixtureProviderId)?.delete(watchToken);
    const count = memoryMatchCount(fixtureProviderId);
    await syncMatchActiveViewers(fixtureProviderId, count);
    if (record.userId) {
      await releaseLiveMatchView(record.userId, fixtureProviderId);
    }
    if (count === 0) {
      await startGraceForMatch(fixtureProviderId);
    }
  } else if (record.surface === "live-center") {
    memoryLiveCenterWatchers.delete(watchToken);
    if (memoryLiveCenterCount() === 0) {
      await startGraceForLiveCenter();
    }
  }
}

async function readGraceStartedAt(key: string): Promise<number | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(key);
    if (raw == null) {
      return null;
    }
    const parsed = Number.parseInt(String(raw), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isWithinGrace(
  graceStartedAt: number | null,
  now = Date.now()
): boolean {
  if (graceStartedAt == null) {
    return false;
  }
  return now - graceStartedAt < LIVE_PRESENCE_GRACE_MS;
}

async function countActiveTokensInSet(setKey: string): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    return 0;
  }

  const tokens = await redis.smembers(setKey);
  let count = 0;

  for (const token of tokens) {
    const exists = await redis.exists(liveWatchTokenKey(String(token)));
    if (exists) {
      count += 1;
    } else {
      await redis.srem(setKey, token);
    }
  }

  return count;
}

export async function countMatchWatchers(
  fixtureProviderId: number
): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const count = await countActiveTokensInSet(
      liveWatchersMatchKey(fixtureProviderId)
    );
    await syncMatchActiveViewers(fixtureProviderId, count);
    return count;
  }
  return memoryMatchCount(fixtureProviderId);
}

export async function countLiveCenterWatchers(): Promise<number> {
  const redis = getRedis();
  if (redis) {
    return countActiveTokensInSet(liveWatchersLiveCenterKey());
  }
  return memoryLiveCenterCount();
}

export async function shouldKeepMatchPollRunning(
  fixtureProviderId: number
): Promise<boolean> {
  const count = await countMatchWatchers(fixtureProviderId);
  if (count > 0) {
    return true;
  }

  const redis = getRedis();
  let graceStartedAt: number | null;
  if (redis) {
    graceStartedAt = await readGraceStartedAt(
      liveGraceMatchKey(fixtureProviderId)
    );
  } else {
    graceStartedAt = memoryGraceMatch.get(fixtureProviderId) ?? null;
  }

  return isWithinGrace(graceStartedAt);
}

export async function shouldKeepLiveCenterPollRunning(): Promise<boolean> {
  const count = await countLiveCenterWatchers();
  if (count > 0) {
    return true;
  }

  const redis = getRedis();
  let graceStartedAt: number | null;
  if (redis) {
    graceStartedAt = await readGraceStartedAt(liveGraceLiveCenterKey());
  } else {
    graceStartedAt = memoryGraceLiveCenter;
  }

  return isWithinGrace(graceStartedAt);
}

export async function listActiveMatchWatchFixtureIds(): Promise<number[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.smembers(liveActiveMatchWatchesKey());
    return raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((id) => Number.isFinite(id));
  }

  return [...memoryMatchWatchers.keys()];
}

export function resetLiveViewersForTests(): void {
  memoryTokens.clear();
  memoryMatchWatchers.clear();
  memoryLiveCenterWatchers.clear();
  memoryGraceMatch.clear();
  memoryGraceLiveCenter = null;
}
