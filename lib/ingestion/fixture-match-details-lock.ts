import { fixtureMatchDetailsLockKey } from "@/lib/redis/keys";
import { LockNotAcquiredError, withLock } from "@/lib/redis/lock";

const MATCH_DETAILS_LOCK_TTL_SEC = 30;

export type FixtureMatchDetailsLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; reason: "match_details_write_lock_not_acquired" };

export async function withFixtureMatchDetailsLock<T>(
  fixtureProviderId: number,
  fn: () => Promise<T>
): Promise<FixtureMatchDetailsLockResult<T>> {
  try {
    const value = await withLock(
      fixtureMatchDetailsLockKey(fixtureProviderId),
      MATCH_DETAILS_LOCK_TTL_SEC,
      fn
    );
    return { acquired: true, value };
  } catch (error) {
    if (error instanceof LockNotAcquiredError) {
      return {
        acquired: false,
        reason: "match_details_write_lock_not_acquired",
      };
    }
    throw error;
  }
}
