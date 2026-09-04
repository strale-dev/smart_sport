/** API-Football seasons use the starting calendar year (e.g. 2025/26 -> 2025). */
export function currentFootballSeasonYear(now = new Date()): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? year : year - 1;
}

export function footballSeasonCandidates(now = new Date()): number[] {
  const current = currentFootballSeasonYear(now);
  return [current, current - 1];
}
