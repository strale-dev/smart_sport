import type { WinProbabilities } from "@/types/prediction";

/** UI/product floor — not a statistical impossibility claim. */
export const WIN_PROBABILITY_MIN_FLOOR = 0.01;

function rebalanceRoundedProbabilities(
  probabilities: WinProbabilities
): WinProbabilities {
  const roundedSum =
    probabilities.home + probabilities.draw + probabilities.away;
  if (Math.abs(roundedSum - 1) <= 1e-6) {
    return probabilities;
  }

  const entries: Array<["home" | "draw" | "away", number]> = [
    ["home", probabilities.home],
    ["draw", probabilities.draw],
    ["away", probabilities.away],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [maxKey] = entries[0]!;

  return {
    ...probabilities,
    [maxKey]: Number((probabilities[maxKey] + (1 - roundedSum)).toFixed(4)),
  };
}

export function normalizeWinProbabilitiesWithFloor(
  probabilities: WinProbabilities,
  floor = WIN_PROBABILITY_MIN_FLOOR
): WinProbabilities {
  const clamped = {
    home: Math.max(floor, probabilities.home),
    draw: Math.max(floor, probabilities.draw),
    away: Math.max(floor, probabilities.away),
  };

  const sum = clamped.home + clamped.draw + clamped.away;
  if (sum <= 0) {
    const even = Number((1 / 3).toFixed(4));
    return { home: even, draw: even, away: even };
  }

  return rebalanceRoundedProbabilities({
    home: Number((clamped.home / sum).toFixed(4)),
    draw: Number((clamped.draw / sum).toFixed(4)),
    away: Number((clamped.away / sum).toFixed(4)),
  });
}
