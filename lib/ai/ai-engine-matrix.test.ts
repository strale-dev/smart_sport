import { describe, expect, it } from "vitest";

import { buildDataAvailableManifest } from "@/lib/ai/context-helpers";
import { mergeNarrativeWithPrediction } from "@/lib/ai/merge-insight";
import {
  AIInsightNarrativeOpenAiSchema,
  AIInsightSchema,
} from "@/lib/ai/schemas";
import { resolveInsightDisplayMetrics } from "@/lib/ai/insight-display-metrics";
import { evaluatePrematchPredictionAccuracy } from "@/lib/match/evaluate-prediction-accuracy";
import { makeMatchTestFixture } from "@/components/match/match-test-fixtures";
import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";
import { probabilitiesSum } from "@/lib/models/logistic";
import { WIN_PROBABILITY_MIN_FLOOR } from "@/lib/models/normalize-probabilities";
import { scorePrematchFromFeatures } from "@/lib/models/features";
import type { PrematchFeatureVector } from "@/types/prediction";

function buildFeature(
  overrides: Partial<PrematchFeatureVector> = {}
): PrematchFeatureVector {
  return {
    fixtureExternalId: 1,
    asOf: "2026-03-01T15:00:00.000Z",
    homeTeamProviderId: 10,
    awayTeamProviderId: 20,
    leagueProviderId: 39,
    eloHome: 1500,
    eloAway: 1500,
    eloDiff: 0,
    form5HomePpg: 1.4,
    form5AwayPpg: 1.4,
    form5HomeVenuePpg: 1.6,
    form5AwayVenuePpg: 1.2,
    form10HomePpg: 1.5,
    form10AwayPpg: 1.5,
    h2hHomeWinRate: 0.5,
    h2hGoalAvg: 2.5,
    homeLeagueRank: 8,
    awayLeagueRank: 8,
    leaguePositionDiff: 0,
    homeStandingPoints: 30,
    awayStandingPoints: 30,
    standingPointsDiff: 0,
    homeRestDays: 7,
    awayRestDays: 7,
    homeGoalsForAvg: 1.4,
    awayGoalsForAvg: 1.4,
    homeGoalsAgainstAvg: 1.1,
    awayGoalsAgainstAvg: 1.1,
    homeXgForAvg: null,
    awayXgForAvg: null,
    homeXgAgainstAvg: null,
    awayXgAgainstAvg: null,
    homeInjuryImpact: null,
    awayInjuryImpact: null,
    homeTopScorersSidelined: 0,
    awayTopScorersSidelined: 0,
    lineupsState: "MISSING",
    hasXg: false,
    dataQuality: "PARTIAL",
    ...overrides,
  };
}

const narrativeFixture = {
  summary: "Home side enter with a narrow statistical edge in this fixture.",
  advantage: "HOME" as const,
  keyFactors: [
    {
      label: "Recent form",
      weight: 0.4,
      evidence: "Home team averaged 2.1 ppg over the last five matches.",
    },
    {
      label: "Head-to-head",
      weight: 0.3,
      evidence: "The last three meetings produced two home wins.",
    },
  ],
  scenarios: {
    likely: "A tight home win with both teams scoring.",
    best: "Home team control early and win comfortably.",
    upset: "Away team absorb pressure and win on the counter.",
  },
  commentary:
    "The model gives the home team a modest edge driven by stronger recent form and home advantage. Data quality is solid but not complete, so confidence stays medium rather than high.",
  dataUsed: ["Model prediction"],
  dataTimestamp: new Date().toISOString(),
  dataQuality: "PARTIAL" as const,
};

function assertPredictionInvariants(
  label: string,
  output: ReturnType<typeof scorePrematchFromFeatures>
) {
  const { winProbabilities } = output;
  const sum = probabilitiesSum(winProbabilities);

  expect(sum, `${label}: probability sum`).toBeGreaterThanOrEqual(0.99);
  expect(sum, `${label}: probability sum`).toBeLessThanOrEqual(1.01);
  expect(winProbabilities.home, `${label}: home floor`).toBeGreaterThanOrEqual(
    WIN_PROBABILITY_MIN_FLOOR
  );
  expect(winProbabilities.draw, `${label}: draw floor`).toBeGreaterThanOrEqual(
    WIN_PROBABILITY_MIN_FLOOR
  );
  expect(winProbabilities.away, `${label}: away floor`).toBeGreaterThanOrEqual(
    WIN_PROBABILITY_MIN_FLOOR
  );
  expect(output.over3Prob, `${label}: over3`).toBeLessThanOrEqual(
    output.over2Prob
  );
  expect(output.expectedGoalsTotalMax).toBeGreaterThanOrEqual(
    output.expectedGoalsTotalMin
  );
  expect(output.expectedGoalsTotalMax).toBeGreaterThanOrEqual(
    Math.floor(output.expectedGoalsTotal)
  );
}

describe("AI engine matrix (Sprint 3)", () => {
  it("1 — strong home vs weak away", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({
        eloDiff: 180,
        form5HomePpg: 2.4,
        form5AwayPpg: 0.8,
        leaguePositionDiff: 10,
      }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("strong home", output);
    expect(output.winProbabilities.home).toBeGreaterThan(
      output.winProbabilities.away
    );
  });

  it("2 — even teams", () => {
    assertPredictionInvariants(
      "even",
      scorePrematchFromFeatures(buildFeature(), DEFAULT_MODEL_COEFFICIENTS)
    );
  });

  it("3 — strong away vs weak home", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({
        eloDiff: -170,
        form5HomePpg: 0.7,
        form5AwayPpg: 2.3,
        leaguePositionDiff: -9,
      }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("strong away", output);
    expect(output.winProbabilities.away).toBeGreaterThan(
      output.winProbabilities.home
    );
  });

  it("4 — key player unavailable adjusts sidelined features", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({
        homeTopScorersSidelined: 2,
        homeInjuryImpact: 0.35,
        dataQuality: "PARTIAL",
      }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("sidelined", output);
  });

  it("5 — confirmed lineups feature state", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({ lineupsState: "CONFIRMED", dataQuality: "COMPLETE" }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("confirmed lineups", output);
  });

  it("6 — no lineup", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({ lineupsState: "MISSING" }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("no lineup", output);
  });

  it("7 — referee present in data manifest", () => {
    const manifest = buildDataAvailableManifest({
      hasStandings: false,
      hasFormAll: true,
      hasFormHomeAway: false,
      hasH2h: false,
      lineupsState: "MISSING",
      hasSidelined: false,
      hasReferee: true,
      hasRound: false,
      hasVenue: false,
      modelPrediction: true,
    });
    expect(manifest).toContain("Referee");
  });

  it("8 — referee absent from data manifest", () => {
    const manifest = buildDataAvailableManifest({
      hasStandings: false,
      hasFormAll: false,
      hasFormHomeAway: false,
      hasH2h: false,
      lineupsState: "MISSING",
      hasSidelined: false,
      hasReferee: false,
      hasRound: false,
      hasVenue: false,
      modelPrediction: true,
    });
    expect(manifest).not.toContain("Referee");
  });

  it("9 — partial statistics (sparse features)", () => {
    const output = scorePrematchFromFeatures(
      buildFeature({
        form5HomePpg: null,
        form5AwayPpg: null,
        h2hHomeWinRate: null,
        homeLeagueRank: null,
        awayLeagueRank: null,
        dataQuality: "PARTIAL",
      }),
      DEFAULT_MODEL_COEFFICIENTS
    );
    assertPredictionInvariants("partial stats", output);
  });

  it("10 — missing data keeps PARTIAL quality and honest dataUsed", () => {
    const merged = mergeNarrativeWithPrediction(
      {
        ...narrativeFixture,
        dataUsed: ["Model prediction"],
        dataQuality: "PARTIAL",
      },
      scorePrematchFromFeatures(buildFeature({ dataQuality: "PARTIAL" })),
      {
        dataAvailable: ["Model prediction"],
        dataMissing: ["Head-to-head"],
      }
    );

    expect(merged.dataQuality).toBe("PARTIAL");
    expect(merged.dataUsed).toEqual(["Model prediction"]);
    expect(() => AIInsightSchema.parse(merged)).not.toThrow();
  });

  it("11 — finished match evaluation vs official snapshot shape", () => {
    const snapshot = scorePrematchFromFeatures(
      buildFeature({ dataQuality: "COMPLETE", lineupsState: "CONFIRMED" })
    );
    const fixture = makeMatchTestFixture("FT", {
      score: {
        home: 2,
        away: 1,
        halftimeHome: 1,
        halftimeAway: 0,
        fulltimeHome: 2,
        fulltimeAway: 1,
        extratimeHome: null,
        extratimeAway: null,
        penaltyHome: null,
        penaltyAway: null,
      },
    });

    const rows = evaluatePrematchPredictionAccuracy(fixture, snapshot);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.id === "1x2")).toBe(true);
  });

  it("LLM narrative schema excludes win probabilities", () => {
    expect(Object.keys(AIInsightNarrativeOpenAiSchema.shape)).not.toContain(
      "winProbabilities"
    );
    expect(Object.keys(AIInsightNarrativeOpenAiSchema.shape)).not.toContain(
      "winOutcome"
    );
  });

  it("UI display metrics prefer prediction engine numbers", () => {
    const merged = AIInsightSchema.parse(
      mergeNarrativeWithPrediction(narrativeFixture, {
        winProbabilities: { home: 0.61, draw: 0.22, away: 0.17 },
        expectedGoalsTotalMin: 2,
        expectedGoalsTotalMax: 4,
        weakerTeamScoringProb: 0.44,
        confidence: "HIGH",
        predictedOutcome: "1",
      })
    );

    const metrics = resolveInsightDisplayMetrics(merged, {
      winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
      predictedOutcome: "1",
      confidence: "MEDIUM",
      expectedGoalsTotalMin: 2,
      expectedGoalsTotalMax: 3,
      expectedGoalsTotal: 2.5,
      over2Prob: 0.52,
      over3Prob: 0.28,
      weakerTeamScoringProb: 0.42,
    });

    expect(metrics.winProbabilities.home).toBe(0.48);
    expect(metrics.confidence).toBe("MEDIUM");
    expect(metrics.over3Prob).toBe(0.28);
  });
});
