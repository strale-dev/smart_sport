import {
  formatDateKeyInTimezone,
  sanitizeTimezone,
} from "@/lib/datetime/timezone";
import { isAuthoritativeLivePresentation } from "@/lib/live/live-presentation";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture, FixtureStatus } from "@/types/domain";

/** Fixed locale so SSR (Node) and client (browser) produce identical kickoff strings. */
const FIXTURE_DISPLAY_LOCALE = "en-GB";

const KICKOFF_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

const KICKOFF_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

export function formatFixtureKickoffTime(
  kickoffAt: string,
  timeZone: string
): string {
  return new Intl.DateTimeFormat(FIXTURE_DISPLAY_LOCALE, {
    ...KICKOFF_TIME_FORMAT,
    timeZone: sanitizeTimezone(timeZone),
  }).format(new Date(kickoffAt));
}

export function formatFixtureKickoffDateTime(
  kickoffAt: string,
  timeZone: string
): string {
  return new Intl.DateTimeFormat(FIXTURE_DISPLAY_LOCALE, {
    ...KICKOFF_DATE_TIME_FORMAT,
    timeZone: sanitizeTimezone(timeZone),
  }).format(new Date(kickoffAt));
}

function fixtureHasRecordedScore(fixture: Fixture): boolean {
  const { home, away, fulltimeHome, fulltimeAway } = fixture.score;
  if (home != null && away != null) {
    return true;
  }
  return fulltimeHome != null && fulltimeAway != null;
}

/** Whether list/hero scoreboards should show goals instead of kickoff time. */
export function shouldShowFixtureScore(fixture: Fixture): boolean {
  if (
    isAuthoritativeLivePresentation(fixture) ||
    isFinishedFixtureStatus(fixture.status)
  ) {
    return true;
  }

  return fixtureHasRecordedScore(fixture);
}

function formatFixtureScoreText(fixture: Fixture): string {
  const home = fixture.score.home ?? fixture.score.fulltimeHome ?? "–";
  const away = fixture.score.away ?? fixture.score.fulltimeAway ?? "–";
  return `${home} – ${away}`;
}

export function formatFixtureScore(fixture: Fixture, timeZone: string): string {
  if (shouldShowFixtureScore(fixture)) {
    return formatFixtureScoreText(fixture);
  }

  return formatFixtureKickoffTime(fixture.kickoffAt, timeZone);
}

/** Center label for list rows: score when live/finished; date+time for future days. */
export function formatFixtureScheduledCenterLabel(
  fixture: Fixture,
  timeZone: string,
  todayDateKey: string
): string {
  if (shouldShowFixtureScore(fixture)) {
    return formatFixtureScoreText(fixture);
  }

  const kickoffDay = formatDateKeyInTimezone(fixture.kickoffAt, timeZone);
  if (kickoffDay === todayDateKey) {
    return formatFixtureKickoffTime(fixture.kickoffAt, timeZone);
  }

  return formatFixtureKickoffDateTime(fixture.kickoffAt, timeZone);
}

/** Row center text; uses scheduled label when todayDateKey is provided. */
export function formatFixtureRowCenterLabel(
  fixture: Fixture,
  timeZone: string,
  todayDateKey?: string
): string {
  if (todayDateKey) {
    return formatFixtureScheduledCenterLabel(fixture, timeZone, todayDateKey);
  }

  return formatFixtureScore(fixture, timeZone);
}

export function formatFixtureStatusLabel(
  status: FixtureStatus,
  minute: number | null
): string {
  if (isLiveFixtureStatus(status)) {
    if (status === "HT") {
      return "HT";
    }

    if (minute != null) {
      return `${minute}'`;
    }

    return "Live";
  }

  if (status === "NS" || status === "TBD") {
    return "Scheduled";
  }

  if (isFinishedFixtureStatus(status)) {
    return "FT";
  }

  return status;
}

export function isFinishedFixtureStatus(status: FixtureStatus): boolean {
  return ["FT", "AET", "PEN", "AWD", "WO"].includes(status);
}

export function formatFixtureMinute(fixture: Fixture): string | null {
  if (!isAuthoritativeLivePresentation(fixture)) {
    return null;
  }

  if (fixture.status === "HT") {
    return "HT";
  }

  if (fixture.minute != null) {
    return `${fixture.minute}'`;
  }

  return "Live";
}

const FINISHED_MATCH_HEADER_LABELS: Partial<Record<FixtureStatus, string>> = {
  FT: "Full time",
  AET: "After extra time",
  PEN: "Penalties",
  AWD: "Awarded",
  WO: "Walkover",
};

const INTERRUPTED_MATCH_HEADER_LABELS: Partial<Record<FixtureStatus, string>> =
  {
    PST: "Postponed",
    CANC: "Cancelled",
    ABD: "Abandoned",
    SUSP: "Suspended",
    INT: "Interrupted",
  };

/** Human-readable status line for match page header meta row (non-live chip). */
export function formatMatchHeaderStatusLabel(
  fixture: Fixture,
  timeZone: string
): string {
  if (isAuthoritativeLivePresentation(fixture)) {
    return formatFixtureMinute(fixture) ?? "Live";
  }

  if (isLiveFixtureStatus(fixture.status)) {
    return FINISHED_MATCH_HEADER_LABELS.FT ?? "Full time";
  }

  const interrupted = INTERRUPTED_MATCH_HEADER_LABELS[fixture.status];
  if (interrupted) {
    return interrupted;
  }

  if (isFinishedFixtureStatus(fixture.status)) {
    return FINISHED_MATCH_HEADER_LABELS[fixture.status] ?? "Full time";
  }

  if (fixture.status === "NS" || fixture.status === "TBD") {
    return formatFixtureKickoffDateTime(fixture.kickoffAt, timeZone);
  }

  return fixture.status;
}
