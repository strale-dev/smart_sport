import type { FixturePlayerPerformance } from "@/types/domain";

export const POTM_MIN_MINUTES = 45;

export function pickPlayerOfTheMatch(
  performances: FixturePlayerPerformance[]
): FixturePlayerPerformance | null {
  const eligible = performances.filter(
    (row) =>
      row.rating != null &&
      row.minutes != null &&
      row.minutes >= POTM_MIN_MINUTES
  );

  if (eligible.length === 0) {
    return null;
  }

  const sorted = [...eligible].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (Math.abs(ratingDiff) >= 0.05) {
      return ratingDiff;
    }

    const goalsDiff = (b.goals ?? 0) - (a.goals ?? 0);
    if (goalsDiff !== 0) {
      return goalsDiff;
    }

    return (b.assists ?? 0) - (a.assists ?? 0);
  });

  return sorted[0] ?? null;
}
