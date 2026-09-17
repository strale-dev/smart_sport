import { describe, expect, it } from "vitest";

import {
  buildMatchClockAnchorFromFixture,
  computeMatchClockDisplay,
} from "@/lib/live/match-clock";
import type { Fixture } from "@/types/domain";

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    externalId: 1,
    league: {
      externalId: 39,
      name: "EPL",
      type: null,
      country: null,
      logoUrl: null,
    },
    seasonYear: 2026,
    homeTeam: {
      externalId: 10,
      name: "Home",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 20,
      name: "Away",
      code: null,
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-15T18:00:00.000Z",
    status: "1H",
    minute: 20,
    score: {
      home: 0,
      away: 0,
      halftimeHome: null,
      halftimeAway: null,
      fulltimeHome: null,
      fulltimeAway: null,
      extratimeHome: null,
      extratimeAway: null,
      penaltyHome: null,
      penaltyAway: null,
    },
    venue: null,
    referee: null,
    round: null,
    liveClock: {
      statusExtraMinute: null,
      lastProviderSyncAt: "2026-09-15T18:20:00.000Z",
      periodFirstStartAt: "2026-09-15T18:00:00.000Z",
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

describe("match-clock", () => {
  it("freezes at HT", () => {
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({ status: "HT", minute: 45 })
    );
    const atT0 = computeMatchClockDisplay(anchor, Date.now());
    const atLater = computeMatchClockDisplay(anchor, Date.now() + 120_000);
    expect(atT0.label).toBe("HT");
    expect(atLater.label).toBe("HT");
    expect(atT0.shouldTick).toBe(false);
  });

  it("advances minute locally in first half", () => {
    const receivedAt = Date.parse("2026-09-15T18:20:00.000Z");
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({ minute: 20 }),
      receivedAt
    );
    const display = computeMatchClockDisplay(anchor, receivedAt + 90_000);
    expect(display.label).toBe("21'");
    expect(display.shouldTick).toBe(true);
  });

  it("shows authoritative stoppage at sync without drift", () => {
    const receivedAt = Date.parse("2026-09-15T18:45:00.000Z");
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({
        minute: 45,
        liveClock: {
          statusExtraMinute: 2,
          lastProviderSyncAt: "2026-09-15T18:45:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      }),
      receivedAt
    );
    expect(computeMatchClockDisplay(anchor, receivedAt).label).toBe("45+2'");
  });

  it("ticks stoppage extra locally when server extra is set", () => {
    const receivedAt = Date.parse("2026-09-15T18:45:00.000Z");
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({
        minute: 45,
        liveClock: {
          statusExtraMinute: 1,
          lastProviderSyncAt: "2026-09-15T18:45:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      }),
      receivedAt
    );

    expect(computeMatchClockDisplay(anchor, receivedAt).label).toBe("45+1'");
    expect(computeMatchClockDisplay(anchor, receivedAt + 60_000).label).toBe(
      "45+2'"
    );
    expect(computeMatchClockDisplay(anchor, receivedAt + 120_000).label).toBe(
      "45+3'"
    );
  });

  it("transitions into first-half stoppage locally", () => {
    const receivedAt = Date.parse("2026-09-15T18:44:00.000Z");
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({
        minute: 44,
        liveClock: {
          statusExtraMinute: null,
          lastProviderSyncAt: "2026-09-15T18:44:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      }),
      receivedAt
    );

    expect(computeMatchClockDisplay(anchor, receivedAt + 60_000).label).toBe(
      "45'"
    );
    expect(computeMatchClockDisplay(anchor, receivedAt + 120_000).label).toBe(
      "45+1'"
    );
  });

  it("ticks second-half stoppage locally", () => {
    const receivedAt = Date.parse("2026-09-15T19:30:00.000Z");
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({
        status: "2H",
        minute: 90,
        liveClock: {
          statusExtraMinute: 1,
          lastProviderSyncAt: "2026-09-15T19:30:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: "2026-09-15T19:00:00.000Z",
        },
      }),
      receivedAt
    );

    expect(computeMatchClockDisplay(anchor, receivedAt + 60_000).label).toBe(
      "90+2'"
    );
  });

  it("resyncs stoppage from a new authoritative snapshot", () => {
    const t0 = Date.parse("2026-09-15T18:45:00.000Z");
    const anchorBefore = buildMatchClockAnchorFromFixture(
      fixture({
        minute: 45,
        liveClock: {
          statusExtraMinute: 1,
          lastProviderSyncAt: "2026-09-15T18:45:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      }),
      t0
    );

    const t1 = Date.parse("2026-09-15T18:47:00.000Z");
    const anchorAfter = buildMatchClockAnchorFromFixture(
      fixture({
        minute: 45,
        liveClock: {
          statusExtraMinute: 3,
          lastProviderSyncAt: "2026-09-15T18:47:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      }),
      t1
    );

    expect(computeMatchClockDisplay(anchorBefore, t0 + 60_000).label).toBe(
      "45+2'"
    );
    expect(computeMatchClockDisplay(anchorAfter, t1).label).toBe("45+3'");
    expect(computeMatchClockDisplay(anchorAfter, t1 + 60_000).label).toBe(
      "45+4'"
    );
  });

  it("stops ticking when finished", () => {
    const anchor = buildMatchClockAnchorFromFixture(
      fixture({ status: "FT", minute: 90 })
    );
    const display = computeMatchClockDisplay(anchor, Date.now());
    expect(display.shouldTick).toBe(false);
    expect(display.label).toBeNull();
  });
});
