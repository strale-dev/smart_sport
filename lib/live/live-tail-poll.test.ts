import { describe, expect, it } from "vitest";

import {
  isProviderSyncStale,
  isWithinLiveTailPollWindow,
} from "@/lib/live/live-presentation";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
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
    seasonYear: 2025,
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
    kickoffAt: "2026-09-17T18:00:00.000Z",
    status: "2H",
    minute: 78,
    score: {
      home: 1,
      away: 0,
      halftimeHome: 1,
      halftimeAway: 0,
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
      lastProviderSyncAt: "2026-09-17T19:30:00.000Z",
      periodFirstStartAt: null,
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

describe("live tail poll window", () => {
  it("allows tail polling within three hours of kickoff", () => {
    const now = Date.parse("2026-09-17T20:30:00.000Z");
    expect(isWithinLiveTailPollWindow("2026-09-17T18:00:00.000Z", now)).toBe(
      true
    );
  });

  it("rejects tail polling long after kickoff", () => {
    const now = Date.parse("2026-09-18T10:00:00.000Z");
    expect(isWithinLiveTailPollWindow("2026-09-17T18:00:00.000Z", now)).toBe(
      false
    );
  });
});

describe("provider sync staleness", () => {
  it("marks missing sync timestamps as stale", () => {
    expect(isProviderSyncStale(null, Date.now())).toBe(true);
  });
});

describe("authoritative live filter", () => {
  it("treats finished statuses as not live", () => {
    expect(isLiveFixtureStatus("FT")).toBe(false);
    expect(isLiveFixtureStatus("PEN")).toBe(false);
    expect(isLiveFixtureStatus("2H")).toBe(true);
    expect(isLiveFixtureStatus("ET")).toBe(true);
    expect(isLiveFixtureStatus("P")).toBe(true);
  });

  it("uses liveClock sync age for stale detection", () => {
    const fresh = fixture({
      liveClock: {
        statusExtraMinute: null,
        lastProviderSyncAt: new Date().toISOString(),
        periodFirstStartAt: null,
        periodSecondStartAt: null,
      },
    });
    expect(
      isProviderSyncStale(fresh.liveClock?.lastProviderSyncAt, Date.now())
    ).toBe(false);
  });
});
