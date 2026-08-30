import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import { LockNotAcquiredError, withLock } from "@/lib/redis/lock";

const inFlight = new Map<string, Promise<unknown>>();

function buildLockKey(requestKey: string): string {
  return `${API_FOOTBALL_CONFIG.dedup.lockKeyPrefix}${requestKey}`;
}

export async function withInFlightDedup<T>(
  requestKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(requestKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await withLock(
        buildLockKey(requestKey),
        API_FOOTBALL_CONFIG.dedup.lockTtlSeconds,
        fn
      );
    } catch (error) {
      if (error instanceof LockNotAcquiredError) {
        return fn();
      }
      throw error;
    } finally {
      inFlight.delete(requestKey);
    }
  })();

  inFlight.set(requestKey, promise);
  return promise;
}

export function resetInFlightDedupForTests(): void {
  inFlight.clear();
}
