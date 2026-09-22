import type { WinProbabilities } from "@/types/prediction";

/** Logistic intercept-only baseline (home advantage only), ~57.2 / 25.4 / 17.4. */
export const GENERIC_BASELINE_WIN_PROBABILITIES: WinProbabilities = {
  home: 0.5718,
  draw: 0.2544,
  away: 0.1738,
};

const BASELINE_EPSILON = 0.008;

export function isGenericBaselineWinProbabilities(
  probabilities: WinProbabilities
): boolean {
  const baseline = GENERIC_BASELINE_WIN_PROBABILITIES;
  return (
    Math.abs(probabilities.home - baseline.home) <= BASELINE_EPSILON &&
    Math.abs(probabilities.draw - baseline.draw) <= BASELINE_EPSILON &&
    Math.abs(probabilities.away - baseline.away) <= BASELINE_EPSILON
  );
}
