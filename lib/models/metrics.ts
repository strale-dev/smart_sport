import type { WinProbabilities } from "@/types/prediction";

export type MatchResultLabel = "1" | "X" | "2";

export function actualOutcomeFromScore(
  homeGoals: number,
  awayGoals: number
): MatchResultLabel {
  if (homeGoals > awayGoals) {
    return "1";
  }
  if (homeGoals < awayGoals) {
    return "2";
  }
  return "X";
}

export function oneHotOutcome(outcome: MatchResultLabel): WinProbabilities {
  switch (outcome) {
    case "1":
      return { home: 1, draw: 0, away: 0 };
    case "X":
      return { home: 0, draw: 1, away: 0 };
    case "2":
      return { home: 0, draw: 0, away: 1 };
  }
}

export function logLoss(
  predicted: WinProbabilities,
  actual: MatchResultLabel,
  epsilon = 1e-15
): number {
  const prob =
    actual === "1"
      ? predicted.home
      : actual === "X"
        ? predicted.draw
        : predicted.away;
  return -Math.log(Math.max(prob, epsilon));
}

export function brierScore(
  predicted: WinProbabilities,
  actual: MatchResultLabel
): number {
  const actualVector = oneHotOutcome(actual);
  return (
    (predicted.home - actualVector.home) ** 2 +
    (predicted.draw - actualVector.draw) ** 2 +
    (predicted.away - actualVector.away) ** 2
  );
}

export function uniformProbabilities(): WinProbabilities {
  return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
}

export function leagueHomeRateProbabilities(
  homeWinRate: number,
  drawRate: number
): WinProbabilities {
  const awayWinRate = Math.max(0, 1 - homeWinRate - drawRate);
  const total = homeWinRate + drawRate + awayWinRate;
  if (total <= 0) {
    return uniformProbabilities();
  }

  return {
    home: homeWinRate / total,
    draw: drawRate / total,
    away: awayWinRate / total,
  };
}

export function averageMetric(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type ConfidenceHistogram = {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
};

export function buildConfidenceHistogram(
  buckets: Array<"HIGH" | "MEDIUM" | "LOW">
): ConfidenceHistogram {
  return buckets.reduce<ConfidenceHistogram>(
    (acc, bucket) => {
      acc[bucket] += 1;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 }
  );
}
