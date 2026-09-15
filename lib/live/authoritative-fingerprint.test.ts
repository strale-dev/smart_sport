import { describe, expect, it } from "vitest";

import {
  buildAuthoritativeFingerprint,
  diffAuthoritativeState,
} from "@/lib/live/authoritative-fingerprint";
import type { AuthoritativeLiveState } from "@/lib/live/authoritative-fingerprint";
import type { Fixture, FixtureEvent } from "@/types/domain";

function baseFixture(overrides: Partial<Fixture> = {}): Fixture {
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
    minute: 10,
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
      lastProviderSyncAt: "2026-09-15T18:10:00.000Z",
      periodFirstStartAt: "2026-09-15T18:00:00.000Z",
      periodSecondStartAt: null,
    },
    ...overrides,
  };
}

function state(
  fixture: Fixture,
  events: FixtureEvent[] = []
): AuthoritativeLiveState {
  return { fixture, events, statistics: [] };
}

describe("authoritative-fingerprint", () => {
  it("treats identical states as unchanged", () => {
    const a = state(baseFixture());
    const b = state(baseFixture());
    expect(buildAuthoritativeFingerprint(a)).toBe(
      buildAuthoritativeFingerprint(b)
    );
    expect(diffAuthoritativeState(a, b).any).toBe(false);
  });

  it("detects score changes", () => {
    const prev = state(baseFixture());
    const next = state(
      baseFixture({
        score: { ...baseFixture().score, home: 1 },
      })
    );
    const flags = diffAuthoritativeState(prev, next);
    expect(flags.fixture).toBe(true);
    expect(flags.any).toBe(true);
  });

  it("ignores lastProviderSyncAt-only drift in fingerprint", () => {
    const prev = state(
      baseFixture({
        liveClock: {
          statusExtraMinute: null,
          lastProviderSyncAt: "2026-09-15T18:10:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      })
    );
    const next = state(
      baseFixture({
        liveClock: {
          statusExtraMinute: null,
          lastProviderSyncAt: "2026-09-15T18:11:00.000Z",
          periodFirstStartAt: null,
          periodSecondStartAt: null,
        },
      })
    );
    expect(diffAuthoritativeState(prev, next).any).toBe(false);
  });

  it("detects event list changes", () => {
    const prev = state(baseFixture());
    const next = state(baseFixture(), [
      {
        externalEventId: "g1",
        minute: 11,
        extraMinute: null,
        teamExternalId: 10,
        playerExternalId: 1,
        assistPlayerExternalId: null,
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      },
    ]);
    expect(diffAuthoritativeState(prev, next).events).toBe(true);
  });
});
