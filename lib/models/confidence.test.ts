import { describe, expect, it } from "vitest";

import {
  bucketConfidence,
  predictedOutcomeFromProbabilities,
} from "@/lib/models/confidence";

describe("confidence", () => {
  it("buckets HIGH when max probability exceeds 60%", () => {
    expect(bucketConfidence({ home: 0.62, draw: 0.2, away: 0.18 })).toBe(
      "HIGH"
    );
  });

  it("buckets MEDIUM between 40% and 60%", () => {
    expect(bucketConfidence({ home: 0.45, draw: 0.3, away: 0.25 })).toBe(
      "MEDIUM"
    );
  });

  it("buckets LOW below 40%", () => {
    expect(bucketConfidence({ home: 0.34, draw: 0.33, away: 0.33 })).toBe(
      "LOW"
    );
  });

  it("selects predicted outcome from probabilities", () => {
    expect(
      predictedOutcomeFromProbabilities({ home: 0.5, draw: 0.25, away: 0.25 })
    ).toBe("1");
  });
});
