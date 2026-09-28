import { describe, expect, it } from "vitest";

import {
  canonicalCurrentSeasonYear,
  FIXTURE_INGEST_MARKS_SEASON_CURRENT,
} from "@/lib/ingestion/season-current-policy";

describe("season current policy", () => {
  it("fixture ingest does not mark seasons as current", () => {
    expect(FIXTURE_INGEST_MARKS_SEASON_CURRENT).toBe(false);
  });

  it("canonical current year is the max year for a league", () => {
    expect(canonicalCurrentSeasonYear([2024, 2026, 2025])).toBe(2026);
    expect(canonicalCurrentSeasonYear([])).toBeNull();
  });
});
