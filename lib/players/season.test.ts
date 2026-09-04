import { describe, expect, it } from "vitest";

import {
  currentFootballSeasonYear,
  footballSeasonCandidates,
} from "@/lib/players/season";

describe("currentFootballSeasonYear", () => {
  it("uses the calendar year from July onwards", () => {
    expect(
      currentFootballSeasonYear(new Date("2026-09-04T12:00:00.000Z"))
    ).toBe(2026);
  });

  it("uses the previous year before July", () => {
    expect(
      currentFootballSeasonYear(new Date("2026-03-01T12:00:00.000Z"))
    ).toBe(2025);
  });
});

describe("footballSeasonCandidates", () => {
  it("tries the current season then the previous one", () => {
    expect(
      footballSeasonCandidates(new Date("2026-09-04T12:00:00.000Z"))
    ).toEqual([2026, 2025]);
  });
});
