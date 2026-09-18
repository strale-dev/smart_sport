import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

/** Covers regulation + extra time + penalties buffer. */
export const LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS = 5 * 60 * 60 * 1000;

/**
 * Provider sync older than this while still marked live triggers revalidation
 * (reconcile job or tail poll).
 */
export const LIVE_STALE_PROVIDER_SYNC_MS = 8 * 60 * 1000;

export function isWithinLiveTailPollWindow(
  kickoffAt: string,
  nowMs = Date.now()
): boolean {
  const kickoffMs = Date.parse(kickoffAt);
  if (!Number.isFinite(kickoffMs)) {
    return false;
  }

  return nowMs - kickoffMs <= LIVE_TAIL_POLL_MAX_AFTER_KICKOFF_MS;
}

export function isProviderSyncStale(
  lastProviderSyncAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!lastProviderSyncAt) {
    return true;
  }

  const syncedMs = Date.parse(lastProviderSyncAt);
  if (!Number.isFinite(syncedMs)) {
    return true;
  }

  return nowMs - syncedMs >= LIVE_STALE_PROVIDER_SYNC_MS;
}

/**
 * A fixture is shown as LIVE only when status is a live enum value and the
 * match is still within the expected live window or has a fresh provider sync.
 */
export function isAuthoritativeLivePresentation(
  fixture: Fixture,
  nowMs = Date.now()
): boolean {
  if (!isLiveFixtureStatus(fixture.status)) {
    return false;
  }

  if (isWithinLiveTailPollWindow(fixture.kickoffAt, nowMs)) {
    return true;
  }

  return !isProviderSyncStale(fixture.liveClock?.lastProviderSyncAt, nowMs);
}

/**
 * Maps stale DB live rows to a finished presentation without mutating storage.
 * Authoritative correction still comes from ingest/reconcile; this prevents UI leaks.
 */
export function resolvePresentationFixture(
  fixture: Fixture,
  nowMs = Date.now()
): Fixture {
  if (!isLiveFixtureStatus(fixture.status)) {
    return fixture;
  }

  if (isAuthoritativeLivePresentation(fixture, nowMs)) {
    return fixture;
  }

  return {
    ...fixture,
    status: "FT",
    minute: null,
    score: {
      ...fixture.score,
      fulltimeHome: fixture.score.fulltimeHome ?? fixture.score.home,
      fulltimeAway: fixture.score.fulltimeAway ?? fixture.score.away,
    },
  };
}

export function resolvePresentationFixtures(
  fixtures: Fixture[],
  nowMs = Date.now()
): Fixture[] {
  return fixtures.map((fixture) => resolvePresentationFixture(fixture, nowMs));
}

export function isPresentationLiveFixture(
  fixture: Fixture,
  nowMs = Date.now()
): boolean {
  return (
    isLiveFixtureStatus(fixture.status) &&
    isAuthoritativeLivePresentation(fixture, nowMs)
  );
}
