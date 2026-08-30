import { getRedis } from "@/lib/redis/client";

export class LockNotAcquiredError extends Error {
  readonly lockKey: string;

  constructor(lockKey: string) {
    super(`Failed to acquire lock: ${lockKey}`);
    this.name = "LockNotAcquiredError";
    this.lockKey = lockKey;
  }
}

type MemoryLockEntry = {
  expiresAt: number;
};

const memoryLocks = new Map<string, MemoryLockEntry>();

function pruneExpiredMemoryLock(key: string, now = Date.now()): void {
  const entry = memoryLocks.get(key);
  if (entry && entry.expiresAt <= now) {
    memoryLocks.delete(key);
  }
}

export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const result = await redis.set(key, "1", {
      nx: true,
      ex: ttlSeconds,
    });
    return result === "OK";
  }

  const now = Date.now();
  pruneExpiredMemoryLock(key, now);
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > now) {
    return false;
  }

  memoryLocks.set(key, { expiresAt: now + ttlSeconds * 1000 });
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }

  memoryLocks.delete(key);
}

export async function renewLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const result = await redis.expire(key, ttlSeconds);
    return result === 1;
  }

  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (!existing || existing.expiresAt <= now) {
    return false;
  }

  memoryLocks.set(key, { expiresAt: now + ttlSeconds * 1000 });
  return true;
}

export async function withLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const acquired = await acquireLock(key, ttlSeconds);
  if (!acquired) {
    throw new LockNotAcquiredError(key);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

export async function withRenewableLock<T>(
  key: string,
  ttlSeconds: number,
  renewIntervalMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const acquired = await acquireLock(key, ttlSeconds);
  if (!acquired) {
    throw new LockNotAcquiredError(key);
  }

  const renewTimer = setInterval(() => {
    void renewLock(key, ttlSeconds);
  }, renewIntervalMs);

  try {
    return await fn();
  } finally {
    clearInterval(renewTimer);
    await releaseLock(key);
  }
}

export function resetMemoryLocksForTests(): void {
  memoryLocks.clear();
}
