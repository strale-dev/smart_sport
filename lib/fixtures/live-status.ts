import type { FixtureStatus } from "@/types/domain";

/** Canonical live statuses — single source for DB is_live, polling, AI phase, UI. */
export const LIVE_FIXTURE_STATUSES = new Set<FixtureStatus>([
  "LIVE",
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "INT",
  "SUSP",
]);

export const PAUSED_LIVE_STATUSES = new Set<FixtureStatus>(["INT", "SUSP"]);

export const PREMATCH_FIXTURE_STATUSES = new Set<FixtureStatus>(["NS", "TBD"]);

export const FINISHED_FIXTURE_STATUSES = new Set<FixtureStatus>([
  "FT",
  "AET",
  "PEN",
]);

export const NEITHER_FIXTURE_STATUSES = new Set<FixtureStatus>([
  "PST",
  "CANC",
  "ABD",
  "AWD",
  "WO",
]);

export function isLiveFixtureStatus(status: FixtureStatus | string): boolean {
  return LIVE_FIXTURE_STATUSES.has(status as FixtureStatus);
}

export function isPausedLiveFixtureStatus(
  status: FixtureStatus | string
): boolean {
  return PAUSED_LIVE_STATUSES.has(status as FixtureStatus);
}

export function isActiveLiveFixtureStatus(
  status: FixtureStatus | string
): boolean {
  return isLiveFixtureStatus(status) && !isPausedLiveFixtureStatus(status);
}

export function isPrematchFixtureStatus(
  status: FixtureStatus | string
): boolean {
  return PREMATCH_FIXTURE_STATUSES.has(status as FixtureStatus);
}

export function isFinishedFixtureStatus(
  status: FixtureStatus | string
): boolean {
  return FINISHED_FIXTURE_STATUSES.has(status as FixtureStatus);
}

/** Poll interval multiplier while match is interrupted/suspended. */
export const PAUSED_LIVE_POLL_INTERVAL_FACTOR = 2.5;
