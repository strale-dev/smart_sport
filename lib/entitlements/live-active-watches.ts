import {
  LIVE_USER_ACTIVE_WATCH_HEARTBEAT_SEC,
  LIVE_USER_ACTIVE_WATCH_TTL_SEC,
} from "@/lib/live/constants";
import { getRedis } from "@/lib/redis/client";
import { liveUserActiveWatchesKey } from "@/lib/redis/keys";

const memoryActiveByUser = new Map<string, Set<number>>();

export async function listActiveLiveFixtureIdsForUser(
  userId: string
): Promise<number[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.smembers(liveUserActiveWatchesKey(userId));
    return raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((id) => Number.isFinite(id));
  }

  return [...(memoryActiveByUser.get(userId) ?? [])];
}

export async function addActiveLiveWatchForUser(
  userId: string,
  fixtureProviderId: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const key = liveUserActiveWatchesKey(userId);
    await redis.sadd(key, String(fixtureProviderId));
    await redis.expire(key, LIVE_USER_ACTIVE_WATCH_TTL_SEC);
    return;
  }

  let set = memoryActiveByUser.get(userId);
  if (!set) {
    set = new Set();
    memoryActiveByUser.set(userId, set);
  }
  set.add(fixtureProviderId);
}

export async function removeActiveLiveWatchForUser(
  userId: string,
  fixtureProviderId: number
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.srem(
      liveUserActiveWatchesKey(userId),
      String(fixtureProviderId)
    );
    return;
  }

  memoryActiveByUser.get(userId)?.delete(fixtureProviderId);
}

export async function renewActiveLiveWatchForUser(
  userId: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const key = liveUserActiveWatchesKey(userId);
  const count = await redis.scard(key);
  if (count > 0) {
    await redis.expire(key, LIVE_USER_ACTIVE_WATCH_TTL_SEC);
  }
}

export async function countDistinctActiveLiveWatchesForUser(
  userId: string
): Promise<number> {
  const ids = await listActiveLiveFixtureIdsForUser(userId);
  return ids.length;
}

export function resetLiveActiveWatchesForTests(): void {
  memoryActiveByUser.clear();
}

export { LIVE_USER_ACTIVE_WATCH_HEARTBEAT_SEC };
