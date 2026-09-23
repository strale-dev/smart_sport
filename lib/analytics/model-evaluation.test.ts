import { describe, expect, it } from "vitest";

import {
  buildCalibrationBins,
  summarizeEvaluationSamples,
  type EvaluationSample,
} from "@/lib/analytics/model-evaluation";

function sample(partial: Partial<EvaluationSample>): EvaluationSample {
  return {
    fixtureId: "f1",
    evaluatedAt: new Date().toISOString(),
    leagueProviderId: 39,
    leagueName: "Premier League",
    confidence: "MEDIUM",
    probabilities: { home: 0.55, draw: 0.25, away: 0.2 },
    actual: "1",
    hit1x2: true,
    ...partial,
  };
}

describe("model-evaluation", () => {
  it("summarizeEvaluationSamples aggregates hit rate and log loss", () => {
    const summary = summarizeEvaluationSamples({
      periodDays: 7,
      finishedFixturesInPeriod: 10,
      samples: [
        sample({ hit1x2: true, actual: "1" }),
        sample({
          hit1x2: false,
          actual: "2",
          probabilities: { home: 0.4, draw: 0.3, away: 0.3 },
        }),
      ],
    });

    expect(summary.evaluatedCount).toBe(2);
    expect(summary.coverageRatio).toBeCloseTo(0.2);
    expect(summary.hitRate1x2).toBeCloseTo(0.5);
    expect(summary.byLeague[0]?.count).toBe(2);
  });

  it("buildCalibrationBins groups by max probability", () => {
    const bins = buildCalibrationBins([
      sample({ probabilities: { home: 0.62, draw: 0.2, away: 0.18 } }),
      sample({ probabilities: { home: 0.35, draw: 0.35, away: 0.3 } }),
    ]);

    const populated = bins.filter((bin) => bin.count > 0);
    expect(populated.length).toBeGreaterThan(0);
  });
});
