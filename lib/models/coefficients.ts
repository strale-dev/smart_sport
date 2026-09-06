import type { ModelCoefficients } from "@/types/prediction";

/** Cold-start coefficients for model version 1.0.0 */
export const DEFAULT_MODEL_COEFFICIENTS: ModelCoefficients = {
  elo: {
    defaultRating: 1500,
    homeAdvantageRating: 65,
    kFactorTopTier: 32,
    kFactorDefault: 24,
    topTierLeagueProviderIds: [39, 140, 135, 78, 61, 2],
  },
  logistic: {
    intercept: { home: 0.35, draw: 0.05, away: -0.35 },
    weights: {
      eloDiffNorm: 1.15,
      form5PpgDiff: 0.55,
      form10PpgDiff: 0.35,
      h2hHomeWinRate: 0.45,
      leaguePositionDiffNorm: 0.4,
      restDaysDiffNorm: 0.15,
      goalsForAvgDiff: 0.25,
      xgForAvgDiff: 0.35,
      homeAdvantage: 0.55,
    },
    temperature: 1.05,
  },
  poisson: {
    baseHomeGoals: 1.45,
    baseAwayGoals: 1.15,
    eloScale: 0.0018,
    formScale: 0.22,
    homeAdvantageGoals: 0.28,
  },
};

export function parseModelCoefficients(value: unknown): ModelCoefficients {
  if (!value || typeof value !== "object") {
    return DEFAULT_MODEL_COEFFICIENTS;
  }

  const parsed = value as Partial<ModelCoefficients>;
  return {
    elo: { ...DEFAULT_MODEL_COEFFICIENTS.elo, ...parsed.elo },
    logistic: {
      ...DEFAULT_MODEL_COEFFICIENTS.logistic,
      ...parsed.logistic,
      intercept: {
        ...DEFAULT_MODEL_COEFFICIENTS.logistic.intercept,
        ...parsed.logistic?.intercept,
      },
      weights: {
        ...DEFAULT_MODEL_COEFFICIENTS.logistic.weights,
        ...parsed.logistic?.weights,
      },
    },
    poisson: { ...DEFAULT_MODEL_COEFFICIENTS.poisson, ...parsed.poisson },
  };
}
