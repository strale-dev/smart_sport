import { describe, expect, it } from "vitest";

import {
  ageDaysBefore,
  lambdaFromHalfLife,
  metricFromValue,
  normalizeWeights,
  weightForKickoff,
  weightedMean,
  weightedRate,
} from "@/lib/analytics/recency-weight";

describe("recency-weight", () => {
  it("assigns higher weight to more recent kickoffs", () => {
    const beforeAt = "2026-03-15T15:00:00.000Z";
    const recent = weightForKickoff({
      kickoffAt: "2026-03-14T12:00:00.000Z",
      beforeAt,
      halfLifeDays: 14,
    });
    const old = weightForKickoff({
      kickoffAt: "2026-01-01T12:00:00.000Z",
      beforeAt,
      halfLifeDays: 14,
    });
    expect(recent).toBeGreaterThan(old);
  });

  it("halves weight at one half-life", () => {
    const halfLife = 14;
    const lambda = lambdaFromHalfLife(halfLife);
    const w0 = Math.exp(-lambda * 0);
    const wHalf = Math.exp(-lambda * halfLife);
    expect(wHalf).toBeCloseTo(w0 / 2, 5);
  });

  it("returns null weighted mean for empty samples", () => {
    expect(weightedMean([])).toBeNull();
  });

  it("normalizeWeights caps total influence", () => {
    const normalized = normalizeWeights([1, 1, 1], 1.5);
    expect(normalized.reduce((s, w) => s + w, 0)).toBeCloseTo(1.5, 5);
  });

  it("metricFromValue marks unavailable without fabricating zero", () => {
    const m = metricFromValue(null, 0, "no_data");
    expect(m.status).toBe("unavailable");
    expect(m.value).toBeNull();
  });

  it("ageDaysBefore is non-negative", () => {
    expect(
      ageDaysBefore("2026-03-15T15:00:00.000Z", "2026-03-20T12:00:00.000Z")
    ).toBe(0);
  });

  it("weightedRate handles empty", () => {
    expect(weightedRate([])).toBeNull();
  });
});
