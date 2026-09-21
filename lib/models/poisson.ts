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

export type GoalMarketProbs = {
  over2Prob: number;
  over3Prob: number;
  under2Prob: number;
};

export type PoissonOutput = {
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotal: number;
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  bttsProb: number;
  weakerTeamScoringProb: number;
  over2Prob: number;
  over3Prob: number;
  under2Prob: number;
};

export function computePoissonOutput(
  features: PrematchFeatureVector,
  coefficients: PoissonCoefficients
): PoissonOutput {
  const eloContribution = coefficients.eloScale * (features.eloDiff / 400);
  const formContribution =
    coefficients.formScale *
    diffOrZero(features.form5HomePpg, features.form5AwayPpg);

  let expectedGoalsHome = Math.max(
    0.2,
    coefficients.baseHomeGoals +
      eloContribution +
      formContribution +
      coefficients.homeAdvantageGoals
  );
  let expectedGoalsAway = Math.max(
    0.2,
    coefficients.baseAwayGoals - eloContribution - formContribution
  );

  const injuryHome = features.homeInjuryImpact ?? 0;
  const injuryAway = features.awayInjuryImpact ?? 0;
  expectedGoalsHome = Math.max(0.2, expectedGoalsHome - injuryHome * 0.15);
  expectedGoalsAway = Math.max(0.2, expectedGoalsAway - injuryAway * 0.15);

  const formVenueDiff = diffOrZero(
    features.form5HomeVenuePpg ?? features.form5HomePpg,
    features.form5AwayVenuePpg ?? features.form5AwayPpg
  );
  if (formVenueDiff !== 0) {
    const venueFormContribution = coefficients.formScale * 0.5 * formVenueDiff;
    expectedGoalsHome = Math.max(
      0.2,
      expectedGoalsHome + venueFormContribution
    );
    expectedGoalsAway = Math.max(
      0.2,
      expectedGoalsAway - venueFormContribution
    );
  }

  const totalGoalsDistribution = buildTotalGoalsDistribution(
    expectedGoalsHome,
    expectedGoalsAway,
    8
  );

  const goalMarkets = computeGoalMarketProbs(totalGoalsDistribution);
  const expectedGoalsTotal = round2(expectedGoalsHome + expectedGoalsAway);

  const expectedGoalsTotalMin = percentileFromDistribution(
    totalGoalsDistribution,
    0.25
  );
  let expectedGoalsTotalMax = percentileFromDistribution(
    totalGoalsDistribution,
    0.75
  );
  expectedGoalsTotalMax = Math.max(
    expectedGoalsTotalMin + 0.5,
    expectedGoalsTotalMax,
    Math.ceil(expectedGoalsTotal)
  );

  const homeScoresProb = 1 - Math.exp(-expectedGoalsHome);
  const awayScoresProb = 1 - Math.exp(-expectedGoalsAway);
  const bttsProb = homeScoresProb * awayScoresProb;

  const weakerTeamScoringProb =
    expectedGoalsHome <= expectedGoalsAway ? homeScoresProb : awayScoresProb;

  return {
    expectedGoalsHome: round2(expectedGoalsHome),
    expectedGoalsAway: round2(expectedGoalsAway),
    expectedGoalsTotal,
    expectedGoalsTotalMin: round2(expectedGoalsTotalMin),
    expectedGoalsTotalMax: round2(expectedGoalsTotalMax),
    bttsProb: clamp01(bttsProb),
    weakerTeamScoringProb: clamp01(weakerTeamScoringProb),
    over2Prob: goalMarkets.over2Prob,
    over3Prob: goalMarkets.over3Prob,
    under2Prob: goalMarkets.under2Prob,
  };
}

/** P(total goals > 2) and P(total goals > 3) from a normalized total-goals PMF. */
export function computeGoalMarketProbs(
  distribution: number[]
): GoalMarketProbs {
  let over2Prob = 0;
  let over3Prob = 0;

  for (let goals = 0; goals < distribution.length; goals += 1) {
    const mass = distribution[goals] ?? 0;
    if (goals > 2) {
      over2Prob += mass;
    }
    if (goals > 3) {
      over3Prob += mass;
    }
  }

  over2Prob = clamp01(over2Prob);
  over3Prob = clamp01(Math.min(over3Prob, over2Prob));

  return {
    over2Prob,
    over3Prob,
    under2Prob: clamp01(1 - over2Prob),
  };
}

export function buildTotalGoalsDistribution(
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
