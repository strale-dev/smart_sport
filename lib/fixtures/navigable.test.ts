import { describe, expect, it } from "vitest";

import {
  filterAllowlistedFixtures,
  isAllowlistedFixture,
} from "@/lib/fixtures/navigable";
import type { Fixture } from "@/types/domain";

function makeFixture(leagueExternalId: number): Fixture {
  return {
    externalId: 1,
    league: {
      externalId: leagueExternalId,
      name: "League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
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
    kickoffAt: "2026-09-08T16:45:00.000Z",
    status: "NS",
    minute: null,
    score: {
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
    },
    venue: null,
    referee: null,
    round: null,
  };
}

describe("navigable fixtures", () => {
  it("allows ingest league ids", () => {
    expect(isAllowlistedFixture(makeFixture(39))).toBe(true);
    expect(isAllowlistedFixture(makeFixture(286))).toBe(true);
  });

  it("rejects leagues outside the ingest allowlist", () => {
    expect(isAllowlistedFixture(makeFixture(999))).toBe(false);
  });

  it("filters mixed fixture lists", () => {
    const filtered = filterAllowlistedFixtures([
      makeFixture(39),
      makeFixture(888),
      makeFixture(140),
    ]);
    expect(filtered.map((f) => f.league.externalId)).toEqual([39, 140]);
  });
});
