import { formatEventMinute } from "@/lib/fixtures/events";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture, FixtureLiveClock, FixtureStatus } from "@/types/domain";

export type MatchClockAnchor = {
  status: FixtureStatus;
  minute: number | null;
  statusExtraMinute: number | null;
  /** Client time when anchor was applied (ms). */
  receivedAtMs: number;
  /** Server authoritative sync time (ms), when available. */
  lastProviderSyncAtMs: number | null;
};

export type MatchClockDisplay = {
  label: string | null;
  shouldTick: boolean;
};

const HALFTIME_STATUSES = new Set<FixtureStatus>(["HT", "BT"]);

const FINISHED_STATUSES = new Set<FixtureStatus>([
  "FT",
  "AET",
  "PEN",
  "AWD",
  "WO",
  "CANC",
  "ABD",
  "PST",
  "SUSP",
]);

const TICKING_STATUSES = new Set<FixtureStatus>([
  "1H",
  "2H",
  "ET",
  "P",
  "LIVE",
]);

const HALF_PERIOD_END: Partial<Record<FixtureStatus, number>> = {
  "1H": 45,
  "2H": 90,
};

function parseTimeMs(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function buildMatchClockAnchorFromFixture(
  fixture: Fixture,
  receivedAtMs = Date.now()
): MatchClockAnchor {
  const liveClock = fixture.liveClock;
  return {
    status: fixture.status,
    minute: fixture.minute,
    statusExtraMinute: liveClock?.statusExtraMinute ?? null,
    receivedAtMs,
    lastProviderSyncAtMs: parseTimeMs(liveClock?.lastProviderSyncAt),
  };
}

function anchorStartMs(anchor: MatchClockAnchor): number {
  const serverMs = anchor.lastProviderSyncAtMs;
  if (serverMs != null && serverMs <= anchor.receivedAtMs) {
    return serverMs;
  }
  return anchor.receivedAtMs;
}

function computeDriftMinutes(anchor: MatchClockAnchor, nowMs: number): number {
  const startMs = anchorStartMs(anchor);
  return Math.max(0, Math.floor((nowMs - startMs) / 60_000));
}

function computeHalfPeriodClockLabel(
  anchor: MatchClockAnchor,
  nowMs: number,
  periodEnd: number
): string {
  const minuteAtSync = anchor.minute ?? 0;
  const extraAtSync = anchor.statusExtraMinute ?? 0;
  const driftMin = computeDriftMinutes(anchor, nowMs);
  const total = minuteAtSync + driftMin;

  const inStoppage =
    extraAtSync > 0 || total > periodEnd || minuteAtSync > periodEnd;

  if (inStoppage) {
    const stoppageExtra =
      extraAtSync > 0 ? extraAtSync + driftMin : total - periodEnd;
    return formatEventMinute(periodEnd, stoppageExtra);
  }

  return `${total}'`;
}

function computeGenericElapsedLabel(
  anchor: MatchClockAnchor,
  nowMs: number
): string | null {
  if (anchor.minute == null) {
    return null;
  }

  const driftMin = computeDriftMinutes(anchor, nowMs);
  const elapsed = anchor.minute + driftMin;
  const extra = anchor.statusExtraMinute;

  if (extra != null && extra > 0) {
    return formatEventMinute(elapsed, extra);
  }

  return `${elapsed}'`;
}

export function computeMatchClockDisplay(
  anchor: MatchClockAnchor,
  nowMs: number
): MatchClockDisplay {
  if (anchor.status === "NS" || anchor.status === "TBD") {
    return { label: null, shouldTick: false };
  }

  if (HALFTIME_STATUSES.has(anchor.status)) {
    return { label: "HT", shouldTick: false };
  }

  if (
    FINISHED_STATUSES.has(anchor.status) ||
    !isLiveFixtureStatus(anchor.status)
  ) {
    return { label: null, shouldTick: false };
  }

  if (!TICKING_STATUSES.has(anchor.status)) {
    return { label: "Live", shouldTick: false };
  }

  const periodEnd = HALF_PERIOD_END[anchor.status];
  if (periodEnd != null) {
    return {
      label: computeHalfPeriodClockLabel(anchor, nowMs, periodEnd),
      shouldTick: true,
    };
  }

  const genericLabel = computeGenericElapsedLabel(anchor, nowMs);
  if (genericLabel == null) {
    return { label: "Live", shouldTick: true };
  }

  return {
    label: genericLabel,
    shouldTick: true,
  };
}

export function liveClockFromFixture(
  fixture: Fixture
): FixtureLiveClock | null {
  return fixture.liveClock ?? null;
}
