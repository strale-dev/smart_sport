import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import { LockNotAcquiredError, withLock } from "@/lib/redis/lock";

const inFlight = new Map<string, Promise<unknown>>();

function buildLockKey(requestKey: string): string {
  return `${API_FOOTBALL_CONFIG.dedup.lockKeyPrefix}${requestKey}`;
}

async function waitForInFlight<T>(
  requestKey: string,
  deadlineMs: number
): Promise<T | undefined> {
  while (Date.now() < deadlineMs) {
    const existing = inFlight.get(requestKey);
    if (existing) {
      return existing as Promise<T>;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, API_FOOTBALL_CONFIG.dedup.lockWaitPollMs)
    );
  }

  return undefined;
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
        const deadline = Date.now() + API_FOOTBALL_CONFIG.dedup.lockWaitMs;
        const coalesced = await waitForInFlight<T>(requestKey, deadline);
        if (coalesced) {
          return coalesced;
        }

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
