import { describe, expect, it } from "vitest";

import {
  AiContextIdentityError,
  assertLivePredictionMatchesFixture,
  assertPrematchPredictionMatchesFixture,
  buildLiveContextHashInput,
  buildPrematchContextHashInput,
  computeLiveSnapshotIdentity,
} from "@/lib/ai/context-hash-input";
import { computeContextHash } from "@/lib/ai/hash";
import type { LiveAiContext, PrematchAiContext } from "@/types/ai";
import type {
  LiveFeatureVector,
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

function minimalPrematchContext(
  overrides: Partial<PrematchAiContext> & {
    fixtureExternalId: number;
    homeExternalId: number;
    awayExternalId: number;
  }
): PrematchAiContext {
  const { fixtureExternalId, homeExternalId, awayExternalId, ...rest } =
    overrides;
  return {
    fixtureExternalId,
    kickoffAt: "2026-09-07T18:00:00.000Z",
    status: "NS",
    venue: null,
    league: {
      externalId: 61,
      name: "Ligue 1",
      category: "domestic_league",
      tier: 1,
      isInternational: false,
      supportsStandings: true,
    },
    homeTeam: {
      externalId: homeExternalId,
      name: "Home",
      isNational: false,
    },
    awayTeam: {
      externalId: awayExternalId,
      name: "Away",
      isNational: false,
    },
    lineupsState: "MISSING",
    round: null,
    referee: null,
    modelVersion: "1.0.0",
    promptVersion: "1.0.0",
    prediction: {
      winProbabilities: { home: 0.4, draw: 0.3, away: 0.3 },
      expectedGoalsHome: 1.4,
      expectedGoalsAway: 1.2,
      expectedGoalsTotalMin: 2,
      expectedGoalsTotalMax: 3,
      bttsProb: 0.55,
      weakerTeamScoringProb: 0.42,
      confidence: "MEDIUM",
      predictedOutcome: "1",
      dataQuality: "PARTIAL",
    },
    form: {
      homeLast5: null,
      awayLast5: null,
      homeLast5Home: null,
      awayLast5Away: null,
    },
    standings: null,
    lineups: null,
    sidelined: null,
    dataAvailable: ["Model prediction"],
    dataMissing: [],
    h2h: null,
    dataQuality: "PARTIAL",
    dataTimestamp: "2026-09-06T12:00:00.000Z",
    analyticsCompact: {
      beforeAt: "2026-09-07T18:00:00.000Z",
      home: { teamExternalId: homeExternalId, windows: {} },
      away: { teamExternalId: awayExternalId, windows: {} },
      h2h: { meetingsInWindow: 0, influenceCapApplied: true },
    } as unknown as PrematchAiContext["analyticsCompact"],
    ...rest,
  };
}

function minimalLiveContext(fixtureExternalId: number): LiveAiContext {
  return {
    fixtureExternalId,
    kickoffAt: "2026-09-07T18:00:00.000Z",
    status: "1H",
    minute: 20,
    score: { home: 1, away: 0 },
    venue: "Arena",
    league: {
      externalId: 61,
      name: "Ligue 1",
      category: "domestic_league",
      tier: 1,
      isInternational: false,
      supportsStandings: true,
    },
    homeTeam: { externalId: 80, name: "Home", isNational: false },
    awayTeam: { externalId: 79, name: "Away", isNational: false },
    lineupsState: "MISSING",
    round: null,
    referee: null,
    modelVersion: "1.0.0",
    promptVersion: "1.0.0",
    meaningfulTriggers: ["LIVE_BASELINE"],
    prediction: {
      winProbabilities: { home: 0.55, draw: 0.25, away: 0.2 },
      expectedGoalsHome: 1.4,
      expectedGoalsAway: 1.1,
      expectedGoalsTotalMin: 2,
      expectedGoalsTotalMax: 3,
      bttsProb: 0.55,
      weakerTeamScoringProb: 0.42,
      confidence: "MEDIUM",
      predictedOutcome: "1",
      dataQuality: "PARTIAL",
    },
    form: {
      homeLast5: null,
      awayLast5: null,
      homeLast5Home: null,
      awayLast5Away: null,
    },
    standings: null,
    lineups: null,
    sidelined: null,
    dataAvailable: ["Model prediction"],
    dataMissing: [],
    h2h: null,
    liveStats: {
      xgHome: 1.1,
      xgAway: 0.5,
      redCardsHome: 0,
      redCardsAway: 0,
      shotsTotalHome: null,
      shotsTotalAway: null,
      shotsOnTargetHome: null,
      shotsOnTargetAway: null,
      ballPossessionHome: null,
      ballPossessionAway: null,
    },
    prematchReference: null,
    dataQuality: "PARTIAL",
    dataTimestamp: "2026-09-06T12:00:00.000Z",
  };
}

function livePrediction(
  partial: Partial<LivePredictionResult> & {
    fixtureExternalId: number;
    predictionId: string;
    snapshot: LiveFeatureVector;
  }
): LivePredictionResult {
  const { snapshot, fixtureExternalId, predictionId, ...rest } = partial;
  return {
    type: "LIVE",
    presentationKind: "LIVE_PROBABILITY",
    fixtureId: "uuid",
    modelVersionId: "mv",
    modelVersion: "1.0.0",
    fixtureExternalId,
    predictionId,
    minute: snapshot.minute,
    winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
    expectedGoalsHome: 1,
    expectedGoalsAway: 1,
    expectedGoalsTotal: 2,
    expectedGoalsTotalMin: 1,
    expectedGoalsTotalMax: 3,
    over2Prob: 0.5,
    over3Prob: 0.3,
    under2Prob: 0.5,
    bttsProb: 0.5,
    weakerTeamScoringProb: 0.4,
    confidence: "MEDIUM",
    predictedOutcome: "1",
    inputSnapshot: snapshot,
    createdAt: "2026-09-07T19:00:00.000Z",
    fromCache: false,
    ...rest,
  };
}

function liveSnapshot(
  fixtureExternalId: number,
  asOf: string
): LiveFeatureVector {
  return {
    fixtureExternalId,
    asOf,
    minute: 20,
    scoreHome: 1,
    scoreAway: 0,
    redCardsHome: 0,
    redCardsAway: 0,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    xgHome: 1.1,
    xgAway: 0.5,
    possessionHome: null,
    possessionAway: null,
    cornersHome: null,
    cornersAway: null,
    anchorWinProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
    priorWinProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
    dataQuality: "PARTIAL",
  };
}

describe("context identity and hash inputs", () => {
  it("prematch hashes differ across fixtures", () => {
    const a = computeContextHash(
      buildPrematchContextHashInput(
        minimalPrematchContext({
          fixtureExternalId: 100,
          homeExternalId: 1,
          awayExternalId: 2,
        })
      )
    );
    const b = computeContextHash(
      buildPrematchContextHashInput(
        minimalPrematchContext({
          fixtureExternalId: 200,
          homeExternalId: 3,
          awayExternalId: 4,
        })
      )
    );
    expect(a).not.toBe(b);
  });

  it("rejects prematch prediction with wrong fixtureExternalId", () => {
    const prediction = {
      fixtureExternalId: 999,
      inputSnapshot: { fixtureExternalId: 999 },
    } as PrematchPredictionResult;

    expect(() =>
      assertPrematchPredictionMatchesFixture(123, prediction)
    ).toThrow(AiContextIdentityError);
  });

  it("rejects live prediction when snapshot fixture mismatches", () => {
    const prediction = livePrediction({
      fixtureExternalId: 123,
      predictionId: "p1",
      snapshot: liveSnapshot(999, "2026-09-07T19:00:00.000Z"),
    });

    expect(() => assertLivePredictionMatchesFixture(123, prediction)).toThrow(
      AiContextIdentityError
    );
  });

  it("live hash changes when predictionId or liveSnapshotId changes", () => {
    const context = minimalLiveContext(123);
    const base = livePrediction({
      fixtureExternalId: 123,
      predictionId: "pred-a",
      snapshot: liveSnapshot(123, "2026-09-07T19:00:00.000Z"),
    });
    const otherId = livePrediction({
      fixtureExternalId: 123,
      predictionId: "pred-b",
      snapshot: liveSnapshot(123, "2026-09-07T19:00:00.000Z"),
    });
    const otherSnapshot = livePrediction({
      fixtureExternalId: 123,
      predictionId: "pred-a",
      snapshot: liveSnapshot(123, "2026-09-07T19:05:00.000Z"),
    });

    const hashA = computeContextHash(buildLiveContextHashInput(context, base));
    const hashB = computeContextHash(
      buildLiveContextHashInput(context, otherId)
    );
    const hashC = computeContextHash(
      buildLiveContextHashInput(context, otherSnapshot)
    );

    expect(hashA).not.toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it("live snapshot identity tracks asOf and score", () => {
    const id1 = computeLiveSnapshotIdentity(
      liveSnapshot(1, "2026-09-07T19:00:00.000Z")
    );
    const id2 = computeLiveSnapshotIdentity({
      ...liveSnapshot(1, "2026-09-07T19:05:00.000Z"),
      scoreHome: 2,
    });
    expect(id1).not.toBe(id2);
  });

  it("meaningful live stat change changes hash; identical noise does not", () => {
    const context = minimalLiveContext(50);
    const prediction = livePrediction({
      fixtureExternalId: 50,
      predictionId: "p1",
      snapshot: liveSnapshot(50, "2026-09-07T19:00:00.000Z"),
    });
    const hash1 = computeContextHash(
      buildLiveContextHashInput(context, prediction)
    );
    const hash2 = computeContextHash(
      buildLiveContextHashInput(
        { ...context, dataTimestamp: "2026-09-07T19:01:00.000Z" },
        prediction
      )
    );
    expect(hash1).toBe(hash2);

    const hash3 = computeContextHash(
      buildLiveContextHashInput(
        {
          ...context,
          liveStats: { ...context.liveStats, xgHome: 2.0 },
        },
        prediction
      )
    );
    expect(hash1).not.toBe(hash3);
  });
});
