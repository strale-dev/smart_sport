import { describe, expect, it } from "vitest";

import { mapFixtureLiveClockFromRaw } from "@/lib/api-football/adapter/fixture";
import type { RawApiFootballFixture } from "@/lib/api-football/types";

function minimalRaw(
  overrides: Partial<RawApiFootballFixture["fixture"]> = {}
): RawApiFootballFixture {
  return {
    fixture: {
      id: 1,
      referee: null,
      timezone: "UTC",
      date: "2026-09-17T12:00:00+00:00",
      timestamp: 1,
      venue: {
        id: null,
        name: null,
        city: null,
        capacity: null,
        surface: null,
        image: null,
      },
      status: { long: "First Half", short: "1H", elapsed: 10, extra: 2 },
      ...overrides,
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: null,
      flag: null,
      season: 2026,
      round: "Regular Season - 1",
      type: "League",
    },
    teams: {
      home: { id: 1, name: "Home", logo: null, winner: null },
      away: { id: 2, name: "Away", logo: null, winner: null },
    },
    goals: { home: 0, away: 0 },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  } as RawApiFootballFixture;
}

describe("mapFixtureLiveClockFromRaw", () => {
  it("maps period timestamps when periods are present", () => {
    const syncedAt = "2026-09-17T12:00:00.000Z";
    const clock = mapFixtureLiveClockFromRaw(
      minimalRaw({
        periods: { first: 1_700_000_000, second: null },
      }),
      syncedAt
    );

    expect(clock?.statusExtraMinute).toBe(2);
    expect(clock?.periodFirstStartAt).toBe(
      new Date(1_700_000_000 * 1000).toISOString()
    );
    expect(clock?.lastProviderSyncAt).toBe(syncedAt);
  });

  it("tolerates missing periods (NS / provider gaps)", () => {
    const clock = mapFixtureLiveClockFromRaw(
      minimalRaw({
        periods: undefined,
        status: {
          long: "Not Started",
          short: "NS",
          elapsed: null,
          extra: null,
        },
      })
    );

    expect(clock?.periodFirstStartAt).toBeNull();
    expect(clock?.periodSecondStartAt).toBeNull();
    expect(clock?.statusExtraMinute).toBeNull();
  });
});
