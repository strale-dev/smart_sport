import {
  computeTeamRankFactor,
  type FixtureStandingsInfo,
} from "@/lib/dashboard/importance-score";
import { getCompetitionTier } from "@/lib/competitions/index";
import type { Fixture } from "@/types/domain";

const TIER2_TEAM_RANK_THRESHOLD = 0.65;
const TIER2_PRESTIGE_THRESHOLD = 50;

export type DashboardPoolContext = {
  preferredLeagueExternalId: number | null;
  prestigeByLeagueId: Map<number, number>;
  standingsByFixtureId: Map<number, FixtureStandingsInfo>;
};

/** Non-live dashboard ranking pools: Tier 1 default; Tier 2 contextual; Tier 3 excluded. */
export function isDashboardRankingCandidate(
  fixture: Fixture,
  context: DashboardPoolContext
): boolean {
  const tier = getCompetitionTier(fixture.league.externalId) ?? 3;

  if (tier === 1) {
    return true;
  }

  if (tier === 3) {
    return false;
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

export function filterDashboardRankingCandidates(
  fixtures: Fixture[],
  context: DashboardPoolContext
): Fixture[] {
  return fixtures.filter((fixture) =>
    isDashboardRankingCandidate(fixture, context)
  );
}
