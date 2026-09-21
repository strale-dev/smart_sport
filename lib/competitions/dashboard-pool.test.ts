import { describe, expect, it } from "vitest";

import {
  createEmptyDashboardFollowPoolSets,
  isDashboardRankingCandidate,
  type DashboardPoolContext,
} from "@/lib/competitions/dashboard-pool";
import { TIER_DEFAULT_PRESTIGE_SCORE } from "@/lib/competitions/prestige";
import type { Fixture } from "@/types/domain";

function makeFixture(
  providerId: number,
  options: {
    externalId?: number;
    homeTeamProviderId?: number;
    awayTeamProviderId?: number;
    status?: Fixture["status"];
  } = {}
): Fixture {
  return {
    externalId: options.externalId ?? providerId * 10_000,
    league: {
      externalId: providerId,
      name: "Test League",
      type: "League",
      country: null,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: options.homeTeamProviderId ?? 1,
      name: "Home",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: options.awayTeamProviderId ?? 2,
      name: "Away",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-09-01T15:00:00.000Z",
    status: options.status ?? "NS",
    minute: options.status === "1H" ? 20 : null,
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
    round: null,
    referee: null,
  };
}

const baseContext: DashboardPoolContext = {
  preferredLeagueExternalId: null,
  prestigeByLeagueId: new Map(),
  standingsByFixtureId: new Map(),
  ...createEmptyDashboardFollowPoolSets(),
};

describe("isDashboardRankingCandidate prestige gate", () => {
  it("includes tier 2 when registry tier default prestige meets threshold", () => {
    const providerId = 203;
    const context: DashboardPoolContext = {
      ...baseContext,
      prestigeByLeagueId: new Map([
        [providerId, TIER_DEFAULT_PRESTIGE_SCORE[2]],
      ]),
    };

    expect(isDashboardRankingCandidate(makeFixture(providerId), context)).toBe(
      true
    );
  });

  it("excludes tier 3 even with tier default prestige", () => {
    const providerId = 204;
    const context: DashboardPoolContext = {
      ...baseContext,
      prestigeByLeagueId: new Map([
        [providerId, TIER_DEFAULT_PRESTIGE_SCORE[3]],
      ]),
    };

    expect(isDashboardRankingCandidate(makeFixture(providerId), context)).toBe(
      false
    );
  });
});

describe("isDashboardRankingCandidate follow exceptions", () => {
  const tier3ProviderId = 204;

  it("includes tier 3 when home or away team is followed", () => {
    const fixture = makeFixture(tier3ProviderId, { homeTeamProviderId: 501 });

    expect(
      isDashboardRankingCandidate(fixture, {
        ...baseContext,
        followedTeamProviderIds: new Set([501]),
      })
    ).toBe(true);

    expect(
      isDashboardRankingCandidate(fixture, {
        ...baseContext,
        followedTeamProviderIds: new Set([502]),
      })
    ).toBe(false);

    expect(
      isDashboardRankingCandidate(
        makeFixture(tier3ProviderId, { awayTeamProviderId: 502 }),
        {
          ...baseContext,
          followedTeamProviderIds: new Set([502]),
        }
      )
    ).toBe(true);
  });

  it("includes tier 3 when league is followed", () => {
    expect(
      isDashboardRankingCandidate(makeFixture(tier3ProviderId), {
        ...baseContext,
        followedLeagueProviderIds: new Set([tier3ProviderId]),
      })
    ).toBe(true);
  });

  it("includes tier 3 when fixture is favorited", () => {
    const fixture = makeFixture(tier3ProviderId, { externalId: 900_001 });

    expect(
      isDashboardRankingCandidate(fixture, {
        ...baseContext,
        favoriteFixtureProviderIds: new Set([900_001]),
      })
    ).toBe(true);
  });

  it("includes live tier 3 without follow data", () => {
    expect(
      isDashboardRankingCandidate(
        makeFixture(tier3ProviderId, { status: "1H" }),
        baseContext
      )
    ).toBe(true);
  });
});
