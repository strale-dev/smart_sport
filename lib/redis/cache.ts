import { ApiFootballQuotaError } from "@/lib/api-football/errors";
import { getRedis } from "@/lib/redis/client";
import { cacheLockKey } from "@/lib/redis/keys";
import { LockNotAcquiredError, withLock } from "@/lib/redis/lock";

export type CacheEnvelope<T> = {
  value: T;
  cachedAt: string;
};

export type CacheMeta = {
  cached: boolean;
  stale: boolean;
  cachedAt?: string;
};

export type CachedResult<T> = {
  value: T;
  meta: CacheMeta;
};

export type CachedOptions<T> = {
  key: string;
  freshTtlSeconds: number | ((value: T) => number);
  staleTtlSeconds: number;
  fn: () => Promise<T>;
  lockKey?: string;
  lockTtlSeconds?: number;
  maxLockWaitAttempts?: number;
  lockWaitMs?: number;
};

const memoryStore = new Map<string, CacheEnvelope<unknown>>();
const memoryExpiresAt = new Map<string, number>();
let hasWarnedAboutMemoryFallback = false;

const DEFAULT_LOCK_TTL_SECONDS = 5;
const DEFAULT_LOCK_WAIT_MS = 50;
const DEFAULT_MAX_LOCK_WAIT_ATTEMPTS = 20;

function warnMemoryFallbackOnce(): void {
  if (hasWarnedAboutMemoryFallback) {
    return;
  }

  hasWarnedAboutMemoryFallback = true;
  console.warn(
    "[cache] Upstash Redis is not configured — using in-memory cache fallback (dev only)."
  );
}

function resolveFreshTtlSeconds<T>(
  freshTtlSeconds: number | ((value: T) => number),
  value: T
): number {
  return typeof freshTtlSeconds === "function"
    ? freshTtlSeconds(value)
    : freshTtlSeconds;
}

function isFresh<T>(
  envelope: CacheEnvelope<T>,
  freshTtlSeconds: number | ((value: T) => number)
): boolean {
  const ttl = resolveFreshTtlSeconds(freshTtlSeconds, envelope.value);
  const ageMs = Date.now() - Date.parse(envelope.cachedAt);
  return ageMs <= ttl * 1000;
}

function toCachedResult<T>(value: T, meta: CacheMeta): CachedResult<T> {
  return { value, meta };
}

async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(key);
    if (!raw) {
      return null;
    }

    if (typeof raw === "string") {
      return JSON.parse(raw) as CacheEnvelope<T>;
    }

    return raw as CacheEnvelope<T>;
  }

  warnMemoryFallbackOnce();
  const expiresAt = memoryExpiresAt.get(key);
  if (expiresAt !== undefined && expiresAt <= Date.now()) {
    memoryStore.delete(key);
    memoryExpiresAt.delete(key);
    return null;
  }

  const envelope = memoryStore.get(key);
  return (envelope as CacheEnvelope<T> | undefined) ?? null;
}

async function writeEnvelope<T>(
  key: string,
  envelope: CacheEnvelope<T>,
  staleTtlSeconds: number
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, JSON.stringify(envelope), { ex: staleTtlSeconds });
    return true;
  }

  warnMemoryFallbackOnce();
  memoryStore.set(key, envelope as CacheEnvelope<unknown>);
  memoryExpiresAt.set(key, Date.now() + staleTtlSeconds * 1000);
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadFreshValue<T>(
  options: CachedOptions<T>
): Promise<CachedResult<T> | null> {
  const envelope = await readEnvelope<T>(options.key);
  if (!envelope) {
    return null;
  }

  if (!isFresh(envelope, options.freshTtlSeconds)) {
    return null;
  }

  return toCachedResult(envelope.value, {
    cached: true,
    stale: false,
    cachedAt: envelope.cachedAt,
  });
}

async function loadStaleValue<T>(
  options: CachedOptions<T>
): Promise<CachedResult<T> | null> {
  const envelope = await readEnvelope<T>(options.key);
  if (!envelope) {
    return null;
  }

  return toCachedResult(envelope.value, {
    cached: true,
    stale: true,
    cachedAt: envelope.cachedAt,
  });
}

async function populateCache<T>(
  options: CachedOptions<T>
): Promise<CachedResult<T>> {
  const lockKey = options.lockKey ?? cacheLockKey(options.key);
  const lockTtlSeconds = options.lockTtlSeconds ?? DEFAULT_LOCK_TTL_SECONDS;
  const maxAttempts =
    options.maxLockWaitAttempts ?? DEFAULT_MAX_LOCK_WAIT_ATTEMPTS;
  const lockWaitMs = options.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const fresh = await loadFreshValue(options);
    if (fresh) {
      return fresh;
    }

    try {
      return await withLock(lockKey, lockTtlSeconds, async () => {
        const freshInsideLock = await loadFreshValue(options);
        if (freshInsideLock) {
          return freshInsideLock;
        }

        try {
          const value = await options.fn();
          const envelope: CacheEnvelope<T> = {
            value,
            cachedAt: new Date().toISOString(),
          };

          try {
            await writeEnvelope(options.key, envelope, options.staleTtlSeconds);
          } catch (error) {
            console.warn("[cache] Failed to write cache entry:", error);
          }

          return toCachedResult(value, {
            cached: false,
            stale: false,
            cachedAt: envelope.cachedAt,
          });
        } catch (error) {
          if (error instanceof ApiFootballQuotaError) {
            const stale = await loadStaleValue(options);
            if (stale) {
              return stale;
            }
          }

          throw error;
        }
      });
    } catch (error) {
      if (error instanceof LockNotAcquiredError) {
        await sleep(lockWaitMs);
        continue;
      }

      throw error;
    }
  }

  const freshAfterWait = await loadFreshValue(options);
  if (freshAfterWait) {
    return freshAfterWait;
  }

  const value = await options.fn();
  const cachedAt = new Date().toISOString();
  const envelope: CacheEnvelope<T> = { value, cachedAt };

  try {
    await writeEnvelope(options.key, envelope, options.staleTtlSeconds);
  } catch (error) {
    console.warn("[cache] Failed to write cache entry:", error);
  }

  return toCachedResult(value, {
    cached: false,
    stale: false,
    cachedAt,
  });
}

export async function cached<T>(
  options: CachedOptions<T>
): Promise<CachedResult<T>> {
  const fresh = await loadFreshValue(options);
  if (fresh) {
    return fresh;
  }

  return populateCache(options);
}

export function resetCacheForTests(): void {
  memoryStore.clear();
  memoryExpiresAt.clear();
  hasWarnedAboutMemoryFallback = false;
}

export async function readCacheEnvelopeForTests<T>(
  key: string
): Promise<CacheEnvelope<T> | null> {
  return readEnvelope<T>(key);
}

export async function writeCacheEnvelopeForTests<T>(
  key: string,
  envelope: CacheEnvelope<T>,
  staleTtlSeconds: number
): Promise<void> {
  await writeEnvelope(key, envelope, staleTtlSeconds);
}
