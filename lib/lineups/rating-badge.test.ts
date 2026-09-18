import { describe, expect, it } from "vitest";

import {
  formatRating,
  ratingTone,
  ratingToneClass,
} from "@/lib/lineups/rating-badge";

describe("rating-badge", () => {
  it("formats ratings to one decimal", () => {
    expect(formatRating(7.234)).toBe("7.2");
    expect(formatRating(null)).toBeNull();
  });

  it("assigns tone thresholds", () => {
    expect(ratingTone(7)).toBe("high");
    expect(ratingTone(6.5)).toBe("mid");
    expect(ratingTone(5.9)).toBe("low");
  });

  it("returns tone classes", () => {
    expect(ratingToneClass(7.1)).toContain("emerald");
    expect(ratingToneClass(6.2)).toContain("amber");
    expect(ratingToneClass(5)).toContain("red");
  });
});
