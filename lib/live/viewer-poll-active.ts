import {
  countMatchWatchers,
  shouldKeepMatchPollRunning,
} from "@/lib/live/viewers";
import { isLockHeld } from "@/lib/redis/lock";
import { lockFixturePollKey } from "@/lib/redis/keys";

/**
 * When true, a presence-gated viewer poll is (or should be) driving provider reads;
 * follow-notification poll must not duplicate ingest/API calls.
 */
export async function isViewerPollActiveForFixture(
  fixtureProviderId: number
): Promise<boolean> {
  if ((await countMatchWatchers(fixtureProviderId)) > 0) {
    return true;
  }

  if (await shouldKeepMatchPollRunning(fixtureProviderId)) {
    return true;
  }

  return isLockHeld(lockFixturePollKey(fixtureProviderId));
}
