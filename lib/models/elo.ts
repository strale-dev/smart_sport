import type { EloCoefficients } from "@/types/prediction";

import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";

export type MatchOutcome = "HOME_WIN" | "AWAY_WIN" | "DRAW";

export function expectedScore(
  ratingA: number,
  ratingB: number
): { scoreA: number; scoreB: number } {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  return { scoreA: expectedA, scoreB: 1 - expectedA };
}

export function getKFactor(
  leagueProviderId: number,
  coefficients: EloCoefficients = DEFAULT_MODEL_COEFFICIENTS.elo
): number {
  return coefficients.topTierLeagueProviderIds.includes(leagueProviderId)
    ? coefficients.kFactorTopTier
    : coefficients.kFactorDefault;
}

export function resolveMatchOutcome(
  homeGoals: number,
  awayGoals: number
): MatchOutcome {
  if (homeGoals > awayGoals) {
    return "HOME_WIN";
  }
  if (awayGoals > homeGoals) {
    return "AWAY_WIN";
  }
  return "DRAW";
}

export function actualScoresForOutcome(outcome: MatchOutcome): {
  home: number;
  away: number;
} {
  switch (outcome) {
    case "HOME_WIN":
      return { home: 1, away: 0 };
    case "AWAY_WIN":
      return { home: 0, away: 1 };
    case "DRAW":
      return { home: 0.5, away: 0.5 };
  }
}

export function updateRating(
  rating: number,
  expected: number,
  actual: number,
  kFactor: number
): number {
  return rating + kFactor * (actual - expected);
}

export function applyEloResult(input: {
  homeRating: number;
  awayRating: number;
  homeGoals: number;
  awayGoals: number;
  leagueProviderId: number;
  coefficients?: EloCoefficients;
}): { homeRating: number; awayRating: number } {
  const coefficients = input.coefficients ?? DEFAULT_MODEL_COEFFICIENTS.elo;
  const kFactor = getKFactor(input.leagueProviderId, coefficients);
  const outcome = resolveMatchOutcome(input.homeGoals, input.awayGoals);
  const actual = actualScoresForOutcome(outcome);

  const homeAdjusted = input.homeRating + coefficients.homeAdvantageRating;
  const { scoreA: expectedHome, scoreB: expectedAway } = expectedScore(
    homeAdjusted,
    input.awayRating
  );

  return {
    homeRating: updateRating(
      input.homeRating,
      expectedHome,
      actual.home,
      kFactor
    ),
    awayRating: updateRating(
      input.awayRating,
      expectedAway,
      actual.away,
      kFactor
    ),
  };
}

export type EloRatingMap = Map<number, number>;

export function getRatingFromMap(
  map: EloRatingMap,
  teamProviderId: number,
  defaultRating = DEFAULT_MODEL_COEFFICIENTS.elo.defaultRating
): number {
  return map.get(teamProviderId) ?? defaultRating;
}

export function applyEloResultToMap(
  map: EloRatingMap,
  input: {
    homeTeamProviderId: number;
    awayTeamProviderId: number;
    homeGoals: number;
    awayGoals: number;
    leagueProviderId: number;
    coefficients?: EloCoefficients;
  }
): void {
  const homeRating = getRatingFromMap(map, input.homeTeamProviderId);
  const awayRating = getRatingFromMap(map, input.awayTeamProviderId);
  const updated = applyEloResult({
    homeRating,
    awayRating,
    homeGoals: input.homeGoals,
    awayGoals: input.awayGoals,
    leagueProviderId: input.leagueProviderId,
    coefficients: input.coefficients,
  });

  map.set(input.homeTeamProviderId, updated.homeRating);
  map.set(input.awayTeamProviderId, updated.awayRating);
}
