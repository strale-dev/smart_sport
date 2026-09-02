import { describe, expect, it } from "vitest";

import { findFavoritesAnchor } from "@/lib/favorites/anchor";
import {
  groupFixturesByDayAndLeagueInTimezone,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
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

describe("groupFixturesByDayAndLeagueInTimezone", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("groups fixtures by user timezone day boundaries", () => {
    const groups = groupFixturesByDayAndLeagueInTimezone(
      [
        makeFixture({
          externalId: 1,
          kickoffAt: "2026-09-02T20:00:00.000Z",
        }),
        makeFixture({
          externalId: 2,
          kickoffAt: "2026-09-02T23:30:00.000Z",
        }),
      ],
      now,
      "Europe/Belgrade"
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.dateKey).toBe("2026-09-02");
    expect(groups[0]?.leagues?.[0]?.fixtures).toHaveLength(1);
    expect(groups[1]?.dateKey).toBe("2026-09-03");
    expect(groups[1]?.leagues?.[0]?.fixtures).toHaveLength(1);
  });
});

describe("findFavoritesAnchor", () => {
  const todayDateKey = "2026-09-02";

  it("prefers a live fixture over the today section", () => {
    const fixtures = [
      makeFixture({
        externalId: 10,
        status: "1H",
        kickoffAt: "2026-09-02T16:00:00.000Z",
      }),
      makeFixture({
        externalId: 20,
        status: "NS",
        kickoffAt: "2026-09-02T18:00:00.000Z",
      }),
    ];
    const dayGroups: FixturesDayGroup[] = [
      { dateKey: todayDateKey, label: "Today", leagues: [] },
    ];

    expect(findFavoritesAnchor(fixtures, dayGroups, todayDateKey)).toEqual({
      fixtureId: 10,
      dayDateKey: null,
    });
  });

  it("anchors to today when there are no live fixtures", () => {
    const fixtures = [
      makeFixture({
        externalId: 20,
        status: "NS",
        kickoffAt: "2026-09-02T18:00:00.000Z",
      }),
    ];
    const dayGroups: FixturesDayGroup[] = [
      { dateKey: todayDateKey, label: "Today", leagues: [] },
    ];

    expect(findFavoritesAnchor(fixtures, dayGroups, todayDateKey)).toEqual({
      fixtureId: null,
      dayDateKey: todayDateKey,
    });
  });

  it("falls back to the next day with fixtures when today is empty", () => {
    const dayGroups: FixturesDayGroup[] = [
      { dateKey: "2026-09-03", label: "Tomorrow", leagues: [] },
    ];

    expect(findFavoritesAnchor([], dayGroups, todayDateKey)).toEqual({
      fixtureId: null,
      dayDateKey: "2026-09-03",
    });
  });
});
