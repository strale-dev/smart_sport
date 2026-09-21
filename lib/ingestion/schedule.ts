import { competitionSupportsStandings } from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import type { CompetitionTier } from "@/lib/competitions/types";
import { getApiFootballDailyLimit } from "@/lib/env";
import { getInMemoryQuotaSnapshot } from "@/lib/api-football/quota";

export type StandingsScheduleInput = {
  leagueProviderId: number;
  tier: CompetitionTier | null;
  upcomingFixtureCount: number;
  liveOrTodayFixtureCount: number;
  standingsStale: boolean;
};

export type StandingsScheduleOptions = {
  maxApiRequests?: number;
  minDailyRemainingRatio?: number;
};

const TIER_WEIGHT: Record<CompetitionTier, number> = {
  1: 100,
  2: 40,
  3: 10,
};

export function scoreStandingsCandidate(input: StandingsScheduleInput): number {
  const competition = findCompetition(input.leagueProviderId);
  if (!competitionSupportsStandings(competition)) {
    return -1;
  }

  const tier = input.tier ?? competition?.tier ?? 3;
  let score = TIER_WEIGHT[tier];

  if (input.standingsStale) {
    score += 25;
  }
  score += Math.min(input.liveOrTodayFixtureCount * 15, 45);
  score += Math.min(input.upcomingFixtureCount * 2, 20);

  return score;
}

export function pickStandingsLeagueIds(
  candidates: StandingsScheduleInput[],
  options: StandingsScheduleOptions = {}
): number[] {
  const maxRequests =
    options.maxApiRequests ??
    Math.min(120, Math.floor(getApiFootballDailyLimit() * 0.02));

  const ranked = candidates
    .map((candidate) => ({
      providerId: candidate.leagueProviderId,
      score: scoreStandingsCandidate(candidate),
    }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, maxRequests).map((item) => item.providerId);
}

export async function shouldRunNonCriticalIngestion(
  minRemainingRatio = 0.08
): Promise<boolean> {
  const snapshot = getInMemoryQuotaSnapshot();
  const dailyLimit = getApiFootballDailyLimit();
  const remaining = snapshot.dayRemaining ?? dailyLimit;
  return remaining / dailyLimit > minRemainingRatio;
}
