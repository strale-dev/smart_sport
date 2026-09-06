import type {
  PoissonCoefficients,
  PrematchFeatureVector,
  WinProbabilities,
} from "@/types/prediction";

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) {
    return k === 0 ? 1 : 0;
  }
  return (Math.exp(-lambda) * lambda ** k) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) {
    return 1;
  }
  let result = 1;
  for (let index = 2; index <= n; index += 1) {
    result *= index;
  }
  return result;
}

function diffOrZero(left: number | null, right: number | null): number {
  if (left == null || right == null) {
    return 0;
  }
  return left - right;
}

export type PoissonOutput = {
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  bttsProb: number;
  weakerTeamScoringProb: number;
};

export function computePoissonOutput(
  features: PrematchFeatureVector,
  coefficients: PoissonCoefficients
): PoissonOutput {
  const eloContribution = coefficients.eloScale * (features.eloDiff / 400);
  const formContribution =
    coefficients.formScale *
    diffOrZero(features.form5HomePpg, features.form5AwayPpg);

  const expectedGoalsHome = Math.max(
    0.2,
    coefficients.baseHomeGoals +
      eloContribution +
      formContribution +
      coefficients.homeAdvantageGoals
  );
  const expectedGoalsAway = Math.max(
    0.2,
    coefficients.baseAwayGoals - eloContribution - formContribution
  );

  const totalGoalsDistribution = buildTotalGoalsDistribution(
    expectedGoalsHome,
    expectedGoalsAway,
    8
  );

  const expectedGoalsTotalMin = percentileFromDistribution(
    totalGoalsDistribution,
    0.25
  );
  const expectedGoalsTotalMax = percentileFromDistribution(
    totalGoalsDistribution,
    0.75
  );

  const homeScoresProb = 1 - Math.exp(-expectedGoalsHome);
  const awayScoresProb = 1 - Math.exp(-expectedGoalsAway);
  const bttsProb = homeScoresProb * awayScoresProb;

  const weakerTeamScoringProb =
    expectedGoalsHome <= expectedGoalsAway ? homeScoresProb : awayScoresProb;

  return {
    expectedGoalsHome: round2(expectedGoalsHome),
    expectedGoalsAway: round2(expectedGoalsAway),
    expectedGoalsTotalMin: round2(expectedGoalsTotalMin),
    expectedGoalsTotalMax: round2(
      Math.max(expectedGoalsTotalMin + 0.5, expectedGoalsTotalMax)
    ),
    bttsProb: clamp01(bttsProb),
    weakerTeamScoringProb: clamp01(weakerTeamScoringProb),
  };
}

function buildTotalGoalsDistribution(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number
): number[] {
  const distribution = new Array(maxGoals + 1).fill(0);
  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
      const total = homeGoals + awayGoals;
      if (total > maxGoals) {
        continue;
      }
      distribution[total] +=
        poissonPmf(lambdaHome, homeGoals) * poissonPmf(lambdaAway, awayGoals);
    }
  }

  const sum = distribution.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return distribution;
  }

  return distribution.map((value) => value / sum);
}

function percentileFromDistribution(
  distribution: number[],
  percentile: number
): number {
  let cumulative = 0;
  for (let goals = 0; goals < distribution.length; goals += 1) {
    cumulative += distribution[goals] ?? 0;
    if (cumulative >= percentile) {
      return goals;
    }
  }
  return distribution.length - 1;
}

export function underdogScoringLabel(
  probability: number
): "HIGH" | "MODERATE" | "LOW" {
  if (probability > 0.5) {
    return "HIGH";
  }
  if (probability >= 0.3) {
    return "MODERATE";
  }
  return "LOW";
}

export function weakerSideFromProbabilities(
  probabilities: WinProbabilities
): "home" | "away" {
  return probabilities.home <= probabilities.away ? "home" : "away";
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
