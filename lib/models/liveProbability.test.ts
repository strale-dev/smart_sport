import { describe, expect, it } from "vitest";

import { scoreLiveFromFeatures } from "@/lib/models/liveProbability";
import type { LiveFeatureVector, WinProbabilities } from "@/types/prediction";

function features(
  anchor: WinProbabilities,
  partial: Partial<LiveFeatureVector> = {}
): LiveFeatureVector {
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
    xgHome: null,
    xgAway: null,
    possessionHome: null,
    possessionAway: null,
    cornersHome: null,
    cornersAway: null,
    anchorWinProbabilities: anchor,
    priorWinProbabilities: anchor,
    dataQuality: "PARTIAL",
    ...partial,
  };
}

/** Audit repro: heavy pre-match home favorite loses 0-2 late — must not stay ~90% home. */
const AUDIT_ANCHOR: WinProbabilities = {
  home: 0.938,
  draw: 0.052,
  away: 0.01,
};

describe("scoreLiveFromFeatures", () => {
  it("audit repro: 0-2 @77' with strong home anchor favors away, home under 20%", () => {
    const output = scoreLiveFromFeatures(
      features(AUDIT_ANCHOR, {
        minute: 77,
        scoreHome: 0,
        scoreAway: 2,
      })
    );

    expect(output.winProbabilities.home).toBeLessThan(0.2);
    expect(output.winProbabilities.away).toBeGreaterThan(
      output.winProbabilities.home
    );
  });

  it("0-1 @17' with balanced anchor: away leads so away win prob exceeds home", () => {
    const anchor = { home: 0.45, draw: 0.28, away: 0.27 };
    const output = scoreLiveFromFeatures(
      features(anchor, {
        minute: 17,
        scoreHome: 0,
        scoreAway: 1,
      })
    );

    expect(output.winProbabilities.home).toBeLessThan(
      output.winProbabilities.away
    );
  });

  it("2-0 @75' with 40/30/30 anchor: home rises by at least +0.25 vs anchor and reaches ≥85%", () => {
    const anchor = { home: 0.4, draw: 0.3, away: 0.3 };
    const output = scoreLiveFromFeatures(
      features(anchor, {
        minute: 75,
        scoreHome: 2,
        scoreAway: 0,
      })
    );

    const homeDelta = output.winProbabilities.home - anchor.home;
    expect(homeDelta).toBeGreaterThanOrEqual(0.25);
    expect(output.winProbabilities.home).toBeGreaterThanOrEqual(0.85);
    expect(output.winProbabilities.away).toBeLessThan(anchor.away);
  });

  it("uses anchorWinProbabilities, not a stale chained priorWinProbabilities", () => {
    const anchor = { home: 0.45, draw: 0.28, away: 0.27 };
    const staleChainPrior = { home: 0.938, draw: 0.052, away: 0.01 };
    const output = scoreLiveFromFeatures(
      features(anchor, {
        minute: 77,
        scoreHome: 0,
        scoreAway: 2,
        anchorWinProbabilities: anchor,
        priorWinProbabilities: staleChainPrior,
      })
    );

    expect(output.winProbabilities.home).toBeLessThan(0.2);
    expect(output.winProbabilities.away).toBeGreaterThan(
      output.winProbabilities.home
    );
  });

  it("returns normalized probabilities", () => {
    const anchor = { home: 0.45, draw: 0.28, away: 0.27 };
    const output = scoreLiveFromFeatures(features(anchor, {}));
    const sum =
      output.winProbabilities.home +
      output.winProbabilities.draw +
      output.winProbabilities.away;
    expect(sum).toBeCloseTo(1, 5);
  });
});
