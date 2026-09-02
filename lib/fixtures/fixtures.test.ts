import { describe, expect, it } from "vitest";

import {
  buildFixturesRangeCacheKey,
  collectActiveLeagueIds,
  collectLiveLeagueIds,
  findNowAnchorFixtureId,
  formatDayLabel,
  groupFixturesByDayAndLeague,
} from "@/lib/fixtures/grouping";
import { providerFixturesRangeKey } from "@/lib/redis/keys";
import { buildFixturesHref, parseFixturesParams } from "@/lib/fixtures/url";
import { buildFixturesWindow } from "@/lib/fixtures/window";
import type { Fixture } from "@/types/domain";

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    externalId: 1,
    league: {
      externalId: 39,
      name: "Premier League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 100,
      name: "Home FC",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 200,
      name: "Away FC",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-02T15:00:00.000Z",
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
    ...overrides,
  };
}

describe("parseFixturesParams", () => {
  it("parses valid league param", () => {
    expect(parseFixturesParams({ league: "39" })).toEqual({ league: 39 });
  });

  it("ignores invalid league param", () => {
    expect(parseFixturesParams({ league: "abc" })).toEqual({});
    expect(parseFixturesParams({ league: "" })).toEqual({});
  });
});

describe("buildFixturesHref", () => {
  it("builds base href without league", () => {
    expect(buildFixturesHref({})).toBe("/fixtures");
  });

  it("builds href with league query", () => {
    expect(buildFixturesHref({}, { league: 39 })).toBe("/fixtures?league=39");
  });
});

describe("buildFixturesWindow", () => {
  it("uses UTC midnight boundaries for a 7-day window", () => {
    const now = new Date("2026-09-02T14:30:00.000Z");
    expect(buildFixturesWindow(now)).toEqual({
      fromDate: "2026-09-02",
      toDateExclusive: "2026-09-10",
    });
  });
});

describe("buildFixturesRangeCacheKey", () => {
  it("uses day-rounded dates, not request timestamps", () => {
    const morning = new Date("2026-09-02T08:00:00.000Z");
    const evening = new Date("2026-09-02T20:00:00.000Z");

    expect(buildFixturesRangeCacheKey(morning)).toBe(
      buildFixturesRangeCacheKey(evening)
    );
    expect(buildFixturesRangeCacheKey(morning)).toBe(
      providerFixturesRangeKey("2026-09-02", "2026-09-10")
    );
  });

  it("changes cache key on the next UTC day", () => {
    const today = new Date("2026-09-02T23:59:00.000Z");
    const tomorrow = new Date("2026-09-03T00:01:00.000Z");

    expect(buildFixturesRangeCacheKey(today)).not.toBe(
      buildFixturesRangeCacheKey(tomorrow)
    );
  });
});

describe("formatDayLabel", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("labels today and tomorrow", () => {
    expect(formatDayLabel("2026-09-02", now)).toBe("Today");
    expect(formatDayLabel("2026-09-03", now)).toBe("Tomorrow");
  });

  it("labels other days with weekday and date", () => {
    const label = formatDayLabel("2026-09-06", now);
    expect(label).toContain("Sunday");
    expect(label).toContain("6");
  });
});

describe("collectLiveLeagueIds", () => {
  it("returns unique league ids with live fixtures", () => {
    expect(
      collectLiveLeagueIds([
        makeFixture({
          league: { ...makeFixture().league, externalId: 39 },
          status: "1H",
        }),
        makeFixture({
          externalId: 2,
          league: { ...makeFixture().league, externalId: 140 },
          status: "2H",
        }),
        makeFixture({ externalId: 3, status: "NS" }),
      ])
    ).toEqual([39, 140]);
  });
});

describe("findNowAnchorFixtureId", () => {
  it("prefers live over upcoming fixtures", () => {
    expect(
      findNowAnchorFixtureId([
        makeFixture({
          externalId: 10,
          status: "NS",
          kickoffAt: "2026-09-02T18:00:00.000Z",
        }),
        makeFixture({
          externalId: 20,
          status: "1H",
          kickoffAt: "2026-09-02T16:00:00.000Z",
        }),
        makeFixture({
          externalId: 30,
          status: "FT",
          kickoffAt: "2026-09-02T12:00:00.000Z",
        }),
      ])
    ).toBe(20);
  });

  it("falls back to first upcoming fixture", () => {
    expect(
      findNowAnchorFixtureId([
        makeFixture({
          externalId: 30,
          status: "FT",
          kickoffAt: "2026-09-02T12:00:00.000Z",
        }),
        makeFixture({
          externalId: 10,
          status: "NS",
          kickoffAt: "2026-09-02T18:00:00.000Z",
        }),
        makeFixture({
          externalId: 11,
          status: "TBD",
          kickoffAt: "2026-09-02T20:00:00.000Z",
        }),
      ])
    ).toBe(10);
  });

  it("returns null when only finished fixtures exist", () => {
    expect(
      findNowAnchorFixtureId([
        makeFixture({
          externalId: 30,
          status: "FT",
          kickoffAt: "2026-09-02T12:00:00.000Z",
        }),
      ])
    ).toBeNull();
  });
});

describe("groupFixturesByDayAndLeague", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("groups all-tab fixtures by day then league", () => {
    const groups = groupFixturesByDayAndLeague(
      [
        makeFixture({ externalId: 1, kickoffAt: "2026-09-02T15:00:00.000Z" }),
        makeFixture({
          externalId: 2,
          kickoffAt: "2026-09-03T15:00:00.000Z",
          league: { ...makeFixture().league, externalId: 140, name: "La Liga" },
        }),
      ],
      undefined,
      now
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe("Today");
    expect(groups[0]?.leagues?.[0]?.providerId).toBe(39);
    expect(groups[1]?.label).toBe("Tomorrow");
    expect(groups[1]?.leagues?.[0]?.providerId).toBe(140);
  });

  it("groups single-league view by day only", () => {
    const groups = groupFixturesByDayAndLeague(
      [
        makeFixture({ externalId: 1, kickoffAt: "2026-09-02T15:00:00.000Z" }),
        makeFixture({ externalId: 2, kickoffAt: "2026-09-02T18:00:00.000Z" }),
      ],
      39,
      now
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.fixtures).toHaveLength(2);
    expect(groups[0]?.leagues).toBeUndefined();
  });
});

describe("collectActiveLeagueIds", () => {
  it("returns leagues in prestige order", () => {
    expect(
      collectActiveLeagueIds([
        makeFixture({
          league: {
            ...makeFixture().league,
            externalId: 286,
            name: "Super Liga",
          },
        }),
        makeFixture({ league: { ...makeFixture().league, externalId: 39 } }),
        makeFixture({
          league: { ...makeFixture().league, externalId: 140, name: "La Liga" },
        }),
      ])
    ).toEqual([39, 140, 286]);
  });
});
