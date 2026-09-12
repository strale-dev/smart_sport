import { describe, expect, it } from "vitest";

import { scoreLiveFromFeatures } from "@/lib/models/liveProbability";
import type { LiveFeatureVector } from "@/types/prediction";

function features(partial: Partial<LiveFeatureVector>): LiveFeatureVector {
  return {
    fixtureExternalId: 1,
    asOf: new Date().toISOString(),
    minute: 60,
    scoreHome: 0,
    scoreAway: 0,
    redCardsHome: 0,
    redCardsAway: 0,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    xgHome: 0.8,
    xgAway: 0.6,
    possessionHome: null,
    possessionAway: null,
    cornersHome: null,
    cornersAway: null,
    priorWinProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
    dataQuality: "COMPLETE",
    ...partial,
  };
}

describe("scoreLiveFromFeatures", () => {
  it("increases home win probability when home leads late", () => {
    const prior = { home: 0.4, draw: 0.3, away: 0.3 };
    const leading = scoreLiveFromFeatures(
      features({
        priorWinProbabilities: prior,
        scoreHome: 2,
        scoreAway: 0,
        minute: 75,
      })
    );

    expect(leading.winProbabilities.home).toBeGreaterThan(prior.home);
    expect(leading.winProbabilities.away).toBeLessThan(prior.away);
  });

  it("returns normalized probabilities", () => {
    const output = scoreLiveFromFeatures(features({}));
    const sum =
      output.winProbabilities.home +
      output.winProbabilities.draw +
      output.winProbabilities.away;
    expect(sum).toBeCloseTo(1, 5);
  });
});
