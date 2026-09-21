import {
  computeTeamRankFactor,
  type FixtureStandingsInfo,
} from "@/lib/dashboard/importance-score";
import { getCompetitionTier } from "@/lib/competitions/index";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

const EMPTY_PROVIDER_ID_SET: ReadonlySet<number> = new Set();

const TIER2_TEAM_RANK_THRESHOLD = 0.65;
const TIER2_PRESTIGE_THRESHOLD = 50;

export type DashboardPoolContext = {
  preferredLeagueExternalId: number | null;
  prestigeByLeagueId: Map<number, number>;
  standingsByFixtureId: Map<number, FixtureStandingsInfo>;
  followedTeamProviderIds: ReadonlySet<number>;
  followedLeagueProviderIds: ReadonlySet<number>;
  favoriteFixtureProviderIds: ReadonlySet<number>;
};

function isTier3FollowPoolException(
  fixture: Fixture,
  context: DashboardPoolContext
): boolean {
  if (context.favoriteFixtureProviderIds.has(fixture.externalId)) {
    return true;
  }

  if (context.followedLeagueProviderIds.has(fixture.league.externalId)) {
    return true;
  }

  return (
    context.followedTeamProviderIds.has(fixture.homeTeam.externalId) ||
    context.followedTeamProviderIds.has(fixture.awayTeam.externalId)
  );
}

/** Non-live dashboard ranking pools: Tier 1 default; Tier 2 contextual; Tier 3 excluded unless followed/favorited. Live: all tiers. */
export function isDashboardRankingCandidate(
  fixture: Fixture,
  context: DashboardPoolContext
): boolean {
  if (isLiveFixtureStatus(fixture.status)) {
    return true;
  }

  const tier = getCompetitionTier(fixture.league.externalId) ?? 3;

  if (tier === 1) {
    return true;
  }

  if (tier === 3) {
    return isTier3FollowPoolException(fixture, context);
  }

  if (
    context.preferredLeagueExternalId != null &&
    fixture.league.externalId === context.preferredLeagueExternalId
  ) {
    return true;
  }

  const prestige =
    context.prestigeByLeagueId.get(fixture.league.externalId) ?? 0;
  if (prestige >= TIER2_PRESTIGE_THRESHOLD) {
    return true;
  }

  const teamRank = computeTeamRankFactor(
    context.standingsByFixtureId.get(fixture.externalId)
  );
  if (teamRank >= TIER2_TEAM_RANK_THRESHOLD) {
    return true;
  }

  return false;
}

export function createEmptyDashboardFollowPoolSets(): {
  followedTeamProviderIds: ReadonlySet<number>;
  followedLeagueProviderIds: ReadonlySet<number>;
  favoriteFixtureProviderIds: ReadonlySet<number>;
} {
  return {
    followedTeamProviderIds: EMPTY_PROVIDER_ID_SET,
    followedLeagueProviderIds: EMPTY_PROVIDER_ID_SET,
    favoriteFixtureProviderIds: EMPTY_PROVIDER_ID_SET,
  };
}

export function filterDashboardRankingCandidates(
  fixtures: Fixture[],
  context: DashboardPoolContext
): Fixture[] {
  return fixtures.filter((fixture) =>
    isDashboardRankingCandidate(fixture, context)
  );
}
