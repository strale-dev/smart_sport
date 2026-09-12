import { describe, expect, it } from "vitest";

import { isAiUpdatedMarkerFresh } from "@/lib/live/ai-updated-marker";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";
import type { Fixture } from "@/types/domain";

function makeFixture(id: number): Fixture {
  return {
    externalId: id,
    league: {
      externalId: 39,
      name: "EPL",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2026,
    homeTeam: {
      externalId: 1,
      name: "Home",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 2,
      name: "Away",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-12T15:00:00.000Z",
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
  };
}

describe("isAiUpdatedMarkerFresh", () => {
  it("returns true within five minutes", () => {
    const now = new Date("2026-09-12T15:04:00.000Z");
    expect(isAiUpdatedMarkerFresh("2026-09-12T15:00:30.000Z", now)).toBe(true);
  });

  it("returns false when older than five minutes", () => {
    const now = new Date("2026-09-12T15:10:00.000Z");
    expect(isAiUpdatedMarkerFresh("2026-09-12T15:00:00.000Z", now)).toBe(false);
  });
});

describe("live center ai tie-breaker ordering", () => {
  it("prefers fresh AI when importance scores tie", () => {
    const now = new Date("2026-09-12T15:02:00.000Z");
    const left: LiveFixtureRow = {
      ...makeFixture(1),
      aiUpdatedAt: "2026-09-12T15:01:00.000Z",
    };
    const right: LiveFixtureRow = {
      ...makeFixture(2),
      aiUpdatedAt: null,
    };

    const leftFresh = isAiUpdatedMarkerFresh(left.aiUpdatedAt, now);
    const rightFresh = isAiUpdatedMarkerFresh(right.aiUpdatedAt, now);

    expect(leftFresh && !rightFresh).toBe(true);
  });
});
