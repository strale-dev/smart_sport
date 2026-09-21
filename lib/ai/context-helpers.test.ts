import { describe, expect, it } from "vitest";

import {
  ANALYSIS_DATA_LABELS,
  buildDataCoverage,
  resolveDisplayDataQuality,
} from "@/lib/ai/data-coverage";

describe("buildDataCoverage", () => {
  it("marks predicted lineups as used and confirmed as missing", () => {
    const coverage = buildDataCoverage({
      supportsStandings: true,
      hasStandings: true,
      hasFormAll: true,
      hasFormHomeAway: true,
      hasH2h: false,
      lineupsState: "PREDICTED",
      hasSidelined: false,
    });

    expect(coverage.dataAvailable).toContain(
      ANALYSIS_DATA_LABELS.predictedLineups
    );
    expect(coverage.dataMissing).toContain(
      ANALYSIS_DATA_LABELS.confirmedLineups
    );
    expect(coverage.dataMissing).toContain(ANALYSIS_DATA_LABELS.headToHead);
  });
});

describe("resolveDisplayDataQuality", () => {
  it("returns PARTIAL when anything is missing or prediction inputs are partial", () => {
    expect(
      resolveDisplayDataQuality({
        dataMissing: [],
        predictionDataQuality: "COMPLETE",
      })
    ).toBe("COMPLETE");

    expect(
      resolveDisplayDataQuality({
        dataMissing: [ANALYSIS_DATA_LABELS.teamForm],
        predictionDataQuality: "COMPLETE",
      })
    ).toBe("PARTIAL");
  });
});
