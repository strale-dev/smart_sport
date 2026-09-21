import { describe, expect, it } from "vitest";

import { LEGACY_CORE_PROVIDER_IDS } from "@/lib/competitions/legacy";
import {
  pickStandingsLeagueIds,
  rankStandingsCandidates,
  scoreStandingsCandidate,
  type StandingsScheduleInput,
} from "@/lib/ingestion/schedule";

const premierLeagueId = LEGACY_CORE_PROVIDER_IDS[0];

function candidate(
  overrides: Partial<StandingsScheduleInput> = {}
): StandingsScheduleInput {
  return {
    leagueProviderId: premierLeagueId,
    tier: 1,
    upcomingFixtureCount: 0,
    liveOrTodayFixtureCount: 0,
    standingsStale: true,
    ...overrides,
  };
}

describe("scoreStandingsCandidate", () => {
  it("returns -1 when standings capability is unsupported", () => {
    expect(
      scoreStandingsCandidate(
        candidate({ leagueProviderId: 1_000_000, tier: 1 })
      )
    ).toBe(-1);
  });

  it("ranks tier-1 leagues above tier-3 when fixture signals match", () => {
    const tier1 = scoreStandingsCandidate(candidate({ tier: 1 }));
    const tier3 = scoreStandingsCandidate(
      candidate({ leagueProviderId: 71, tier: 3 })
    );

    expect(tier1).toBeGreaterThan(tier3);
  });

  it("adds fixture activity and staleness bonuses", () => {
    const baseline = scoreStandingsCandidate(candidate());
    const boosted = scoreStandingsCandidate(
      candidate({
        upcomingFixtureCount: 4,
        liveOrTodayFixtureCount: 2,
        standingsStale: true,
      })
    );

    expect(boosted).toBe(baseline + 8 + 30);
  });

  it("caps fixture bonuses", () => {
    const score = scoreStandingsCandidate(
      candidate({
        upcomingFixtureCount: 50,
        liveOrTodayFixtureCount: 50,
      })
    );

    expect(score).toBe(100 + 25 + 45 + 20);
  });
});

describe("pickStandingsLeagueIds", () => {
  it("orders by score and applies per-run cap", () => {
    const ranked = rankStandingsCandidates([
      candidate({ leagueProviderId: 140, tier: 1, liveOrTodayFixtureCount: 1 }),
      candidate({ leagueProviderId: 286, tier: 3 }),
      candidate({ leagueProviderId: 39, tier: 1, liveOrTodayFixtureCount: 3 }),
    ]);

    expect(ranked[0]?.providerId).toBe(39);
    expect(
      pickStandingsLeagueIds(
        [
          candidate({
            leagueProviderId: 140,
            tier: 1,
            liveOrTodayFixtureCount: 1,
          }),
          candidate({ leagueProviderId: 286, tier: 3 }),
          candidate({
            leagueProviderId: 39,
            tier: 1,
            liveOrTodayFixtureCount: 3,
          }),
        ],
        { maxApiRequests: 2 }
      )
    ).toEqual([39, 140]);
  });
});
