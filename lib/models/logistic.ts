import type {
  LogisticCoefficients,
  PrematchFeatureVector,
  WinProbabilities,
} from "@/types/prediction";

function softmax3(
  home: number,
  draw: number,
  away: number,
  temperature: number
): WinProbabilities {
  const scaledHome = home / temperature;
  const scaledDraw = draw / temperature;
  const scaledAway = away / temperature;
  const maxLogit = Math.max(scaledHome, scaledDraw, scaledAway);
  const expHome = Math.exp(scaledHome - maxLogit);
  const expDraw = Math.exp(scaledDraw - maxLogit);
  const expAway = Math.exp(scaledAway - maxLogit);
  const total = expHome + expDraw + expAway;

  return {
    home: expHome / total,
    draw: expDraw / total,
    away: expAway / total,
  };
}

function normalizeEloDiff(eloDiff: number): number {
  return eloDiff / 400;
}

function normalizePositionDiff(positionDiff: number | null): number {
  if (positionDiff == null) {
    return 0;
  }
  return positionDiff / 10;
}

function normalizeRestDaysDiff(
  homeRestDays: number | null,
  awayRestDays: number | null
): number {
  if (homeRestDays == null || awayRestDays == null) {
    return 0;
  }
  return (homeRestDays - awayRestDays) / 7;
}

function diffOrZero(left: number | null, right: number | null): number {
  if (left == null || right == null) {
    return 0;
  }
  return left - right;
}

export function computeLogisticProbabilities(
  features: PrematchFeatureVector,
  coefficients: LogisticCoefficients
): WinProbabilities {
  const { intercept, weights, temperature } = coefficients;

  const eloDiffNorm = normalizeEloDiff(features.eloDiff);
  const form5PpgDiff = diffOrZero(features.form5HomePpg, features.form5AwayPpg);
  const form10PpgDiff = diffOrZero(
    features.form10HomePpg,
    features.form10AwayPpg
  );
  const h2hHomeWinRate = features.h2hHomeWinRate ?? 0.5;
  const leaguePositionDiffNorm = normalizePositionDiff(
    features.leaguePositionDiff
  );
  const restDaysDiffNorm = normalizeRestDaysDiff(
    features.homeRestDays,
    features.awayRestDays
  );
  const goalsForAvgDiff = diffOrZero(
    features.homeGoalsForAvg,
    features.awayGoalsForAvg
  );
  const xgForAvgDiff = features.hasXg
    ? diffOrZero(features.homeXgForAvg, features.awayXgForAvg)
    : 0;

  const shared =
    weights.eloDiffNorm * eloDiffNorm +
    weights.form5PpgDiff * form5PpgDiff +
    weights.form10PpgDiff * form10PpgDiff +
    weights.h2hHomeWinRate * (h2hHomeWinRate - 0.5) +
    weights.leaguePositionDiffNorm * leaguePositionDiffNorm +
    weights.restDaysDiffNorm * restDaysDiffNorm +
    weights.goalsForAvgDiff * goalsForAvgDiff +
    weights.xgForAvgDiff * xgForAvgDiff;

  const homeLogit = intercept.home + shared + weights.homeAdvantage;
  const drawLogit = intercept.draw;
  const awayLogit = intercept.away - shared;

  return softmax3(homeLogit, drawLogit, awayLogit, temperature);
}

export function probabilitiesSum(probabilities: WinProbabilities): number {
  return probabilities.home + probabilities.draw + probabilities.away;
}

export function summarizeProbabilityDistribution(
  probabilities: WinProbabilities[]
): {
  minMaxProb: number;
  maxMaxProb: number;
  medianMaxProb: number;
  outcomeCounts: { home: number; draw: number; away: number };
} {
  if (probabilities.length === 0) {
    return {
      minMaxProb: 0,
      maxMaxProb: 0,
      medianMaxProb: 0,
      outcomeCounts: { home: 0, draw: 0, away: 0 },
    };
  }

  const maxProbs = probabilities.map((entry) =>
    Math.max(entry.home, entry.draw, entry.away)
  );
  const sorted = [...maxProbs].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const medianMaxProb =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;

  const outcomeCounts = { home: 0, draw: 0, away: 0 };
  for (const entry of probabilities) {
    if (entry.home >= entry.draw && entry.home >= entry.away) {
      outcomeCounts.home += 1;
    } else if (entry.draw >= entry.home && entry.draw >= entry.away) {
      outcomeCounts.draw += 1;
    } else {
      outcomeCounts.away += 1;
    }
  }

  return {
    minMaxProb: sorted[0]!,
    maxMaxProb: sorted[sorted.length - 1]!,
    medianMaxProb,
    outcomeCounts,
  };
}
