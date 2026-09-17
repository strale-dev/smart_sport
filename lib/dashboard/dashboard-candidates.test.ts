import { describe, expect, it } from "vitest";

import {
  assertNoPastFinishedInTodayPool,
  buildForwardFallbackFixtures,
  mergeLiveIntoImportantCandidates,
  resolveTodayCandidates,
  sortImportantTodayFixtures,
} from "@/lib/dashboard/dashboard-candidates";
import type { Fixture } from "@/types/domain";

const todayUtc = "2026-09-14";

function makeFixture(
  externalId: number,
  kickoffAt: string,
  status: Fixture["status"]
): Fixture {
  return {
    externalId,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
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
    kickoffAt,
    status,
    minute: status === "2H" ? 70 : null,
    score: {
      home: status === "FT" ? 2 : null,
      away: status === "FT" ? 1 : null,
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

describe("dashboard candidates", () => {
  it("builds forward fallback without yesterday fixtures", () => {
    const yesterdayFt = makeFixture(1, "2026-09-13T18:00:00.000Z", "FT");
    const tomorrowNs = makeFixture(2, "2026-09-15T15:00:00.000Z", "NS");

    const forward = buildForwardFallbackFixtures({
      todayUtc,
      tomorrowFixtures: [tomorrowNs],
      upcomingFixtures: [yesterdayFt, tomorrowNs],
    });

    expect(forward.map((f) => f.externalId)).toEqual([2]);
  });

  it("never puts yesterday FT into todayCandidates even when today and forward are empty", () => {
    const yesterdayFt = makeFixture(10, "2026-09-13T18:00:00.000Z", "FT");
    const { todayCandidates } = resolveTodayCandidates({
      todayFixtures: [],
      forwardFallback: [],
    });

    expect(todayCandidates).toEqual([]);
    expect(() =>
      assertNoPastFinishedInTodayPool(todayUtc, [yesterdayFt])
    ).toThrow(/leaked into today pool/);
  });

  it("includes live fixtures in important candidates regardless of kickoff date", () => {
    const liveYesterdayKickoff = makeFixture(
      20,
      "2026-09-13T21:00:00.000Z",
      "2H"
    );
    const todayNs = makeFixture(21, "2026-09-14T15:00:00.000Z", "NS");

    const merged = mergeLiveIntoImportantCandidates(
      [todayNs],
      [liveYesterdayKickoff]
    );

    expect(merged.map((f) => f.externalId)).toEqual([20, 21]);
  });

  it("sorts live fixtures before upcoming by kickoff", () => {
    const live = makeFixture(30, "2026-09-13T20:00:00.000Z", "1H");
    const later = makeFixture(31, "2026-09-14T20:00:00.000Z", "NS");
    const sooner = makeFixture(32, "2026-09-14T16:00:00.000Z", "NS");

    const sorted = sortImportantTodayFixtures([later, live, sooner], {
      prestigeByLeagueId: new Map(),
      standingsByFixtureId: new Map(),
      h2hInterestByFixtureId: new Map(),
      preferredLeagueExternalId: null,
      now: new Date("2026-09-14T12:00:00.000Z"),
    });

    expect(sorted.map((f) => f.externalId)).toEqual([30, 32, 31]);
  });
});
