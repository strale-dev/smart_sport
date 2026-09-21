import { describe, expect, it } from "vitest";

import {
  normalizeWinProbabilitiesWithFloor,
  WIN_PROBABILITY_MIN_FLOOR,
} from "@/lib/models/normalize-probabilities";

describe("normalizeWinProbabilitiesWithFloor", () => {
  it("applies floor and sums to 1", () => {
    const normalized = normalizeWinProbabilitiesWithFloor({
      home: 0.98,
      draw: 0.01,
      away: 0.01,
    });

    expect(normalized.home).toBeGreaterThan(WIN_PROBABILITY_MIN_FLOOR);
    expect(normalized.draw).toBeGreaterThanOrEqual(WIN_PROBABILITY_MIN_FLOOR);
    expect(normalized.away).toBeGreaterThanOrEqual(WIN_PROBABILITY_MIN_FLOOR);
    expect(normalized.home + normalized.draw + normalized.away).toBeCloseTo(
      1,
      3
    );
  });

  it("never returns a zero probability", () => {
    const normalized = normalizeWinProbabilitiesWithFloor({
      home: 0.999,
      draw: 0.0005,
      away: 0.0005,
    });

    expect(normalized.home).toBeGreaterThan(0);
    expect(normalized.draw).toBeGreaterThan(0);
    expect(normalized.away).toBeGreaterThan(0);
  });
});
