import { formatDateKeyInTimezone } from "@/lib/datetime/timezone";
import {
  isFinishedFixtureStatus,
  isLiveFixtureStatus,
  isPausedLiveFixtureStatus,
  isPrematchFixtureStatus,
  NEITHER_FIXTURE_STATUSES,
} from "@/lib/fixtures/live-status";
import type { FixtureStatus } from "@/types/domain";

import {
  IMMINENT_BEFORE_KICKOFF_MS,
  LIFECYCLE_TIMEZONE,
  PREMATCH_SCHEDULED_LEAD_MS,
} from "./constants";
import type { FixtureLifecyclePhase, LiveSubState } from "./types";

export function msUntilKickoff(kickoffAt: string, nowMs: number): number {
  return new Date(kickoffAt).getTime() - nowMs;
}

export function isKickoffTodayBelgrade(
  kickoffAt: string,
  now = new Date()
): boolean {
  const today = formatDateKeyInTimezone(now, LIFECYCLE_TIMEZONE);
  const kickoffDay = formatDateKeyInTimezone(kickoffAt, LIFECYCLE_TIMEZONE);
  return kickoffDay === today;
}

export function isImminentBelgrade(
  kickoffAt: string,
  nowMs = Date.now()
): boolean {
  const until = msUntilKickoff(kickoffAt, nowMs);
  return until > 0 && until <= IMMINENT_BEFORE_KICKOFF_MS;
}

export function isUpcomingBeyondScheduleWindow(
  kickoffAt: string,
  nowMs = Date.now()
): boolean {
  return msUntilKickoff(kickoffAt, nowMs) > PREMATCH_SCHEDULED_LEAD_MS;
}

export function resolveLiveSubState(status: string): LiveSubState {
  if (!isLiveFixtureStatus(status)) {
    return null;
  }
  return isPausedLiveFixtureStatus(status) ? "paused" : "active";
}

export function resolveLifecyclePhase(input: {
  status: string;
  kickoffAt: string;
  nowMs?: number;
  predictionReady: boolean;
  aiReady: boolean;
  postmatchComplete: boolean;
}): FixtureLifecyclePhase {
  const status = input.status as FixtureStatus;
  const nowMs = input.nowMs ?? Date.now();

  if (NEITHER_FIXTURE_STATUSES.has(status)) {
    return "NEITHER";
  }

  if (isLiveFixtureStatus(status)) {
    return input.aiReady ? "LIVE_UPDATING" : "LIVE";
  }

  if (isFinishedFixtureStatus(status)) {
    if (!input.postmatchComplete) {
      return "POSTMATCH_COLLECTING";
    }
    return "HISTORICAL";
  }

  if (!isPrematchFixtureStatus(status)) {
    return "NEITHER";
  }

  if (isUpcomingBeyondScheduleWindow(input.kickoffAt, nowMs)) {
    return "UPCOMING";
  }

  if (input.aiReady) {
    return "AI_READY";
  }

  if (input.predictionReady) {
    return "PREDICTION_READY";
  }

  return "PREMATCH_COLLECTING";
}

export function isKickoffReached(
  kickoffAt: string,
  nowMs = Date.now()
): boolean {
  return nowMs >= new Date(kickoffAt).getTime();
}
