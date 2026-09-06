import type { AiConfidence, WinProbabilities } from "@/types/prediction";

export function bucketConfidence(
  probabilities: WinProbabilities
): AiConfidence {
  const maxProb = Math.max(
    probabilities.home,
    probabilities.draw,
    probabilities.away
  );

  if (maxProb > 0.6) {
    return "HIGH";
  }

  if (maxProb >= 0.4) {
    return "MEDIUM";
  }

  return "LOW";
}

export function predictedOutcomeFromProbabilities(
  probabilities: WinProbabilities
): "1" | "X" | "2" {
  const { home, draw, away } = probabilities;
  if (home >= draw && home >= away) {
    return "1";
  }
  if (draw >= home && draw >= away) {
    return "X";
  }
  return "2";
}

export function maxWinProbability(probabilities: WinProbabilities): number {
  return Math.max(probabilities.home, probabilities.draw, probabilities.away);
}
