import { describe, expect, it } from "vitest";

import {
  applyTemperatureScaling,
  averageLogLossForSamples,
  fitTemperatureScaling,
} from "@/lib/models/calibration";

describe("calibration", () => {
  it("fitTemperatureScaling lowers log-loss on overconfident samples", () => {
    const samples = Array.from({ length: 40 }, (_, index) => ({
      actual: (index % 3 === 0 ? "1" : index % 3 === 1 ? "X" : "2") as
        "1" | "X" | "2",
      probabilities: {
        home: 0.7,
        draw: 0.15,
        away: 0.15,
      },
    }));

    const baseline = averageLogLossForSamples(samples);
    const { temperature, logLoss } = fitTemperatureScaling(samples);

    expect(temperature).toBeGreaterThan(1);
    expect(logLoss).toBeLessThan(baseline);
  });

  it("applyTemperatureScaling preserves ordering at T=1", () => {
    const probs = { home: 0.5, draw: 0.25, away: 0.25 };
    const scaled = applyTemperatureScaling(probs, 1);
    expect(scaled.home).toBeCloseTo(probs.home, 3);
  });
});
