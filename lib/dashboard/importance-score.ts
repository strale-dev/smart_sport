import type { Fixture } from "@/types/domain";

export type FixtureStandingsInfo = {
  homeRank: number | null;
  awayRank: number | null;
  teamCount: number | null;
};

export type ImportanceContext = {
  prestigeByLeagueId: Map<number, number>;
  standingsByFixtureId: Map<number, FixtureStandingsInfo>;
  h2hInterestByFixtureId: Map<number, number>;
  now: Date;
};

const PRESTIGE_FALLBACK = 0.3;
const KICKOFF_SIGMA_HOURS = 3;

/** TODO(Phase 5): restore user-follow bonus when follow UI ships. */
const FOLLOW_BONUS_V1 = 1.0;

export function computePrestigeFactor(
  leagueExternalId: number,
  prestigeByLeagueId: Map<number, number>
): number {
  const score = prestigeByLeagueId.get(leagueExternalId);
  if (score == null || score <= 0) {
    return PRESTIGE_FALLBACK;
  }

  return Math.min(score / 100, 1);
}

export function computeTeamRankFactor(
  info: FixtureStandingsInfo | undefined
): number {
  if (!info) {
    return 1;
  }

  const { homeRank, awayRank, teamCount } = info;
  if (
    homeRank == null ||
    awayRank == null ||
    teamCount == null ||
    teamCount <= 0
  ) {
    return 1;
  }

  const bestRank = Math.min(homeRank, awayRank);
  return (teamCount + 1 - bestRank) / teamCount;
}

/**
 * Placeholder heuristic: measures H2H meeting density, not true rivalry/interest.
 * Replace with analyticsService.getH2H interest signal in Phase 3.
 */
export function computeH2hInterestFactor(ratio: number | undefined): number {
  if (ratio == null || ratio <= 0) {
    return 1;
  }

  return Math.min(Math.max(ratio, 0), 1);
}

/**
 * Symmetric Gaussian around kickoff: exp(-0.5 * (Δt/σ)²).
 * Δt is signed hours from kickoff; decays equally for past FT and future NS fixtures.
 */
export function computeKickoffProximityFactor(
  kickoffAt: string,
  now: Date,
  sigmaHours = KICKOFF_SIGMA_HOURS
): number {
  const kickoffMs = new Date(kickoffAt).getTime();
  const deltaHours = (kickoffMs - now.getTime()) / (1000 * 60 * 60);
  const normalized = deltaHours / sigmaHours;

  return Math.exp(-0.5 * normalized * normalized);
}

export function computeFollowBonusFactor(): number {
  return FOLLOW_BONUS_V1;
}

export function computeImportanceScore(
  fixture: Fixture,
  context: ImportanceContext
): number {
  const prestige = computePrestigeFactor(
    fixture.league.externalId,
    context.prestigeByLeagueId
  );
  const teamRank = computeTeamRankFactor(
    context.standingsByFixtureId.get(fixture.externalId)
  );
  const h2hInterest = computeH2hInterestFactor(
    context.h2hInterestByFixtureId.get(fixture.externalId)
  );
  const kickoffProximity = computeKickoffProximityFactor(
    fixture.kickoffAt,
    context.now
  );
  const followBonus = computeFollowBonusFactor();

  return prestige * teamRank * h2hInterest * kickoffProximity * followBonus;
}

export function rankFixturesByImportance(
  fixtures: Fixture[],
  context: ImportanceContext
): Array<{ fixture: Fixture; score: number }> {
  return fixtures
    .map((fixture) => ({
      fixture,
      score: computeImportanceScore(fixture, context),
    }))
    .sort((a, b) => b.score - a.score);
}
