/**
 * Fixture-driven ingest only ensures a seasons row exists for FK wiring.
 * Current-season flags come from bootstrap/league API (upsertSeason + is_current clear).
 */
export const FIXTURE_INGEST_MARKS_SEASON_CURRENT = false;

/** Used by migration repair: one current row per league = max calendar year present. */
export function canonicalCurrentSeasonYear(
  years: readonly number[]
): number | null {
  if (years.length === 0) {
    return null;
  }
  return Math.max(...years);
}
