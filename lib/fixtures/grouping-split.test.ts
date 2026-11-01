import { describe, expect, it } from "vitest";

import {
  buildUpcomingAndPastDayGroups,
  collectUpcomingFixturesFromDayGroups,
  partitionFixturesByTodayWindow,
} from "@/lib/fixtures/grouping";
import type { Fixture } from "@/types/domain";

const todayDateKey = "2026-09-14";
const timeZone = "Europe/Belgrade";

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
    minute: status === "2H" ? 78 : null,
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

describe("buildUpcomingAndPastDayGroups", () => {
  const now = new Date("2026-09-14T12:00:00.000Z");

  it("places past finished fixtures in pastDayGroups only", () => {
    const yesterdayFt = makeFixture(1, "2026-09-13T18:00:00.000Z", "FT");
    const todayNs = makeFixture(2, "2026-09-14T16:00:00.000Z", "NS");

    const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
      [yesterdayFt, todayNs],
      now,
      timeZone,
      todayDateKey
    );

    expect(
      pastDayGroups.flatMap((g) => g.leagues?.[0]?.fixtures ?? [])
    ).toEqual([yesterdayFt]);
    expect(
      collectUpcomingFixturesFromDayGroups(upcomingDayGroups).map(
        (f) => f.externalId
      )
    ).toEqual([2]);
  });

  it("keeps LIVE fixtures with yesterday kickoff in upcoming (Today group)", () => {
    const liveNow = new Date("2026-09-14T00:30:00.000Z");
    const liveLate = makeFixture(10, "2026-09-13T21:00:00.000Z", "2H");
    const yesterdayFt = makeFixture(11, "2026-09-13T18:00:00.000Z", "FT");

    const partitioned = partitionFixturesByTodayWindow(
      [liveLate, yesterdayFt],
      todayDateKey,
      timeZone,
      liveNow
    );

    expect(partitioned.upcomingFixtures.map((f) => f.externalId)).toEqual([10]);
    expect(partitioned.pastFixtures.map((f) => f.externalId)).toEqual([11]);

    const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
      [liveLate, yesterdayFt],
      liveNow,
      timeZone,
      todayDateKey
    );

    expect(upcomingDayGroups[0]?.dateKey).toBe(todayDateKey);
    expect(upcomingDayGroups[0]?.label).toBe("Today");
    expect(
      upcomingDayGroups[0]?.leagues?.[0]?.fixtures.map((f) => f.externalId)
    ).toEqual([10]);
    expect(pastDayGroups.length).toBe(1);
  });

  it("moves same-day NS after kickoff into past fixtures", () => {
    const staleTodayNs = makeFixture(20, "2026-09-14T10:00:00.000Z", "NS");
    const futureTodayNs = makeFixture(21, "2026-09-14T18:00:00.000Z", "NS");

    const partitioned = partitionFixturesByTodayWindow(
      [staleTodayNs, futureTodayNs],
      todayDateKey,
      timeZone,
      now
    );

    expect(partitioned.pastFixtures.map((f) => f.externalId)).toEqual([20]);
    expect(partitioned.upcomingFixtures.map((f) => f.externalId)).toEqual([21]);

    const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
      [staleTodayNs, futureTodayNs],
      now,
      timeZone,
      todayDateKey
    );

    expect(
      collectUpcomingFixturesFromDayGroups(upcomingDayGroups).map(
        (f) => f.externalId
      )
    ).toEqual([21]);
    expect(
      pastDayGroups
        .flatMap((g) => g.leagues?.[0]?.fixtures ?? [])
        .map((f) => f.externalId)
    ).toEqual([20]);
  });

  it("sorts upcoming days ascending and past days descending", () => {
    const dayBefore = makeFixture(1, "2026-09-12T15:00:00.000Z", "FT");
    const yesterday = makeFixture(2, "2026-09-13T15:00:00.000Z", "FT");
    const tomorrow = makeFixture(3, "2026-09-15T15:00:00.000Z", "NS");
    const dayAfter = makeFixture(4, "2026-09-16T15:00:00.000Z", "NS");

    const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
      [dayBefore, yesterday, tomorrow, dayAfter],
      now,
      timeZone,
      todayDateKey
    );

    expect(upcomingDayGroups.map((g) => g.dateKey)).toEqual([
      "2026-09-15",
      "2026-09-16",
    ]);
    expect(pastDayGroups.map((g) => g.dateKey)).toEqual([
      "2026-09-13",
      "2026-09-12",
    ]);
  });
});
