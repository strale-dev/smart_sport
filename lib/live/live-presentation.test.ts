import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FIXTURE_STATUS_UNVERIFIED_LABEL,
  formatFixtureScheduledCenterLabel,
  formatMatchHeaderStatusLabel,
} from "@/lib/fixtures/display";
import {
  isAuthoritativeLivePresentation,
  resolvePresentationFixture,
} from "@/lib/live/live-presentation";
import type { Fixture, ScoreSnapshot } from "@/types/domain";

const BELGRADE = "Europe/Belgrade";

function emptyScore(): ScoreSnapshot {
  return {
    home: null,
    away: null,
    halftimeHome: null,
    halftimeAway: null,
    fulltimeHome: null,
    fulltimeAway: null,
    extratimeHome: null,
    extratimeAway: null,
    penaltyHome: null,
    penaltyAway: null,
  };
}

function buildLiveFixture(overrides: Partial<Fixture> = {}): Fixture {
  const kickoffAt = overrides.kickoffAt ?? "2026-10-31T10:00:00.000Z";

  return {
    externalId: 9001,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2026,
    homeTeam: {
      externalId: 1,
      name: "Home",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 2,
      name: "Away",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    kickoffAt,
    status: "2H",
    minute: null,
    score: emptyScore(),
    venue: null,
    referee: null,
    round: null,
    liveClock: {
      statusExtraMinute: null,
      lastProviderSyncAt: "2026-10-31T10:05:00.000Z",
      periodFirstStartAt: kickoffAt,
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

describe("resolvePresentationFixture (B2)", () => {
  const nowMs = Date.parse("2026-10-31T16:00:00.000Z");
  const kickoffSixHoursAgo = "2026-10-31T10:00:00.000Z";
  const staleSyncAt = "2026-10-31T10:20:00.000Z";

  it("does not silently present stale-beyond-tail live as clean FT when polling is off", () => {
    const fixture = buildLiveFixture({
      kickoffAt: kickoffSixHoursAgo,
      status: "2H",
      minute: null,
      liveClock: {
        statusExtraMinute: null,
        lastProviderSyncAt: staleSyncAt,
        periodFirstStartAt: kickoffSixHoursAgo,
        periodSecondStartAt: null,
      },
    });

    const presented = resolvePresentationFixture(fixture, nowMs, {
      livePollingEnabled: false,
    });

    expect(presented.status).not.toBe("FT");
    expect(presented.status).toBe("2H");
    expect(isAuthoritativeLivePresentation(presented, nowMs)).toBe(false);
  });

  it("keeps live inside the tail window even when provider sync is stale", () => {
    const nowInsideTail = Date.parse("2026-10-31T13:00:00.000Z");
    const fixture = buildLiveFixture({
      kickoffAt: kickoffSixHoursAgo,
      minute: 67,
      liveClock: {
        statusExtraMinute: null,
        lastProviderSyncAt: staleSyncAt,
        periodFirstStartAt: kickoffSixHoursAgo,
        periodSecondStartAt: null,
      },
    });

    const presented = resolvePresentationFixture(fixture, nowInsideTail, {
      livePollingEnabled: false,
    });

    expect(presented.status).toBe("2H");
    expect(presented.minute).toBe(67);
    expect(isAuthoritativeLivePresentation(presented, nowInsideTail)).toBe(
      true
    );
  });

  it("still maps expired stale live to FT when polling is on", () => {
    const fixture = buildLiveFixture({
      kickoffAt: kickoffSixHoursAgo,
      liveClock: {
        statusExtraMinute: null,
        lastProviderSyncAt: staleSyncAt,
        periodFirstStartAt: kickoffSixHoursAgo,
        periodSecondStartAt: null,
      },
    });

    const presented = resolvePresentationFixture(fixture, nowMs, {
      livePollingEnabled: true,
    });

    expect(presented.status).toBe("FT");
  });
});

describe("unverified expired live display (B2)", () => {
  const previousPolling = process.env.LIVE_POLLING_ENABLED;
  const kickoff = "2026-10-31T10:00:00.000Z";
  const now = new Date("2026-10-31T16:00:00.000Z");

  beforeEach(() => {
    process.env.LIVE_POLLING_ENABLED = "false";
  });

  afterEach(() => {
    if (previousPolling === undefined) {
      delete process.env.LIVE_POLLING_ENABLED;
    } else {
      process.env.LIVE_POLLING_ENABLED = previousPolling;
    }
  });

  it("labels expired stale live as Status unverified instead of FT or score dashes", () => {
    const fixture = buildLiveFixture({
      kickoffAt: kickoff,
      liveClock: {
        statusExtraMinute: null,
        lastProviderSyncAt: "2026-10-31T10:20:00.000Z",
        periodFirstStartAt: kickoff,
        periodSecondStartAt: null,
      },
    });
    const presented = resolvePresentationFixture(fixture, now.getTime(), {
      livePollingEnabled: false,
    });

    expect(formatMatchHeaderStatusLabel(presented, BELGRADE, now)).toBe(
      FIXTURE_STATUS_UNVERIFIED_LABEL
    );
    expect(
      formatFixtureScheduledCenterLabel(presented, BELGRADE, "2026-10-31", now)
    ).toBe(FIXTURE_STATUS_UNVERIFIED_LABEL);
    expect(formatMatchHeaderStatusLabel(presented, BELGRADE, now)).not.toBe(
      "Full time"
    );
  });
});
