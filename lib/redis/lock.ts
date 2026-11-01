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

function acquireMemoryLock(key: string, ttlSeconds: number): boolean {
  const now = Date.now();
  pruneExpiredMemoryLock(key, now);
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > now) {
    return false;
  }

  memoryLocks.set(key, { expiresAt: now + ttlSeconds * 1000 });
  return true;
}

function isMemoryLockHeld(key: string): boolean {
  const now = Date.now();
  pruneExpiredMemoryLock(key, now);
  const existing = memoryLocks.get(key);
  return existing != null && existing.expiresAt > now;
}

export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const result = await redis.set(key, "1", {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    } catch {
      console.warn(
        "[lock] Redis lock acquire failed; using in-memory lock fallback."
      );
    }
  }

  return acquireMemoryLock(key, ttlSeconds);
}

export async function releaseLock(key: string): Promise<void> {
  memoryLocks.delete(key);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      console.warn("[lock] Redis lock release failed; in-memory lock cleared.");
    }
  }
}

export async function isLockHeld(key: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get(key);
      return value != null;
    } catch {
      console.warn(
        "[lock] Redis lock check failed; using in-memory lock state."
      );
    }
  }

  return isMemoryLockHeld(key);
}

export async function renewLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const result = await redis.expire(key, ttlSeconds);
      return result === 1;
    } catch {
      console.warn(
        "[lock] Redis lock renew failed; using in-memory lock fallback."
      );
    }
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
