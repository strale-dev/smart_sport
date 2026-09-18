import { readFixtureByProviderIdFromDb } from "@/lib/ingestion/db-read";
import {
  isWithinLiveTailPollWindow,
  LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS,
} from "@/lib/live/live-presentation";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

export {
  isAuthoritativeLivePresentation,
  isProviderSyncStale,
  isWithinLiveTailPollWindow,
  LIVE_STALE_PROVIDER_SYNC_MS,
  LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS,
} from "@/lib/live/live-presentation";

/**
 * Continue server polling without active viewers until the DB/API path records
 * a non-live status or the tail window expires.
 */
export async function shouldTailPollLiveFixture(
  fixtureProviderId: number,
  nowMs = Date.now()
): Promise<boolean> {
  const fixture = await readFixtureByProviderIdFromDb(fixtureProviderId);
  if (!fixture || !isLiveFixtureStatus(fixture.status)) {
    return false;
  }

  if (!isWithinLiveTailPollWindow(fixture.kickoffAt, nowMs)) {
    return false;
  }

  return true;
}
