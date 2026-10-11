import { describe, expect, it } from "vitest";

import {
  LIVE_PROBABILITY_SHIFT_THRESHOLD,
  isProbabilityShiftMeaningful,
} from "@/lib/live/probability-shift";

describe("isProbabilityShiftMeaningful", () => {
  const before = { home: 0.5, draw: 0.25, away: 0.25 };

  it("returns false below the documented threshold", () => {
    const after = { home: 0.59, draw: 0.21, away: 0.2 };
    expect(isProbabilityShiftMeaningful(before, after)).toBe(false);
    expect(LIVE_PROBABILITY_SHIFT_THRESHOLD).toBe(0.1);
  });

  it("returns true at or above 10pp on any outcome", () => {
    const after = { home: 0.61, draw: 0.19, away: 0.2 };
    expect(isProbabilityShiftMeaningful(before, after)).toBe(true);
  });
});
