import { describe, expect, it } from "vitest";

import {
  confidenceMeetsMinimum,
  resolveTopPicksConfig,
} from "@/lib/predictions/top-picks-config";
import {
  CONFIDENCE_SCORE,
  DATA_QUALITY_SCORE,
  dataQualityMeetsMinimum,
  rankScore,
} from "@/lib/predictions/top-picks-scoring";

describe("top-picks scoring", () => {
  it("computes rank score from probability confidence and data quality", () => {
    const score = rankScore({
      winProbabilities: { home: 0.6, draw: 0.25, away: 0.15 },
      confidence: "HIGH",
      dataQuality: "COMPLETE",
    });
    expect(score).toBeCloseTo(
      0.6 * CONFIDENCE_SCORE.HIGH * DATA_QUALITY_SCORE.COMPLETE
    );
  });

  it("filters data quality minimum", () => {
    expect(dataQualityMeetsMinimum("COMPLETE", "COMPLETE")).toBe(true);
    expect(dataQualityMeetsMinimum("PARTIAL", "COMPLETE")).toBe(false);
    expect(dataQualityMeetsMinimum("PARTIAL", "PARTIAL")).toBe(true);
  });
});

describe("top-picks config", () => {
  it("uses defaults when env is unset", () => {
    const config = resolveTopPicksConfig({});
    expect(config.minModelProbability).toBe(0.55);
    expect(config.minConfidence).toBe("MEDIUM");
    expect(config.limit).toBe(10);
  });

  it("respects confidence minimum ordering", () => {
    expect(confidenceMeetsMinimum("HIGH", "MEDIUM")).toBe(true);
    expect(confidenceMeetsMinimum("LOW", "MEDIUM")).toBe(false);
  });
});
