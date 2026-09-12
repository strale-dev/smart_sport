import type { WinProbabilities } from "@/types/prediction";

/** PRD §7.7 / Phase 5 — regenerate live AI when any outcome moves ≥ 10pp. */
export const LIVE_PROBABILITY_SHIFT_THRESHOLD = 0.1;

export function computeMaxProbabilityShift(
  before: WinProbabilities,
  after: WinProbabilities
): number {
  return Math.max(
    Math.abs(after.home - before.home),
    Math.abs(after.draw - before.draw),
    Math.abs(after.away - before.away)
  );
}

export function isProbabilityShiftMeaningful(
  before: WinProbabilities,
  after: WinProbabilities,
  threshold = LIVE_PROBABILITY_SHIFT_THRESHOLD
): boolean {
  return computeMaxProbabilityShift(before, after) >= threshold;
}
