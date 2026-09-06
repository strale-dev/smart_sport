import { describe, expect, it } from "vitest";

import {
  applyEloResult,
  expectedScore,
  getRatingFromMap,
  updateRating,
} from "@/lib/models/elo";

describe("elo", () => {
  it("expectedScore favors the higher-rated team", () => {
    const { scoreA, scoreB } = expectedScore(1600, 1500);
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA + scoreB).toBeCloseTo(1, 5);
  });

  it("updates ratings after a home win", () => {
    const result = applyEloResult({
      homeRating: 1500,
      awayRating: 1500,
      homeGoals: 2,
      awayGoals: 0,
      leagueProviderId: 39,
    });

    expect(result.homeRating).toBeGreaterThan(1500);
    expect(result.awayRating).toBeLessThan(1500);
  });

  it("returns default rating for unknown teams in map", () => {
    expect(getRatingFromMap(new Map(), 999)).toBe(1500);
  });

  it("updateRating moves toward actual score", () => {
    const next = updateRating(1500, 0.4, 1, 32);
    expect(next).toBeGreaterThan(1500);
  });
});
