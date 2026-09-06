import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMemoryLocksForTests } from "@/lib/redis/lock";

const readLatestPrematchPrediction = vi.fn();
const insertPrematchPrediction = vi.fn();
const getActiveModelVersion = vi.fn();
const resolveFixtureUuidByExternalId = vi.fn();
const buildPrematchFeatures = vi.fn();
const scorePrematchFromFeatures = vi.fn();

vi.mock("@/lib/predictions/db", () => ({
  readLatestPrematchPrediction,
  insertPrematchPrediction,
  getActiveModelVersion,
  resolveFixtureUuidByExternalId,
  mapPredictionRowToResult: (
    row: {
      id: string;
      fixture_id: string;
      model_version_id: string;
      home_win_prob: number;
      draw_prob: number;
      away_win_prob: number;
      expected_goals_home: number;
      expected_goals_away: number;
      expected_goals_total_min: number;
      expected_goals_total_max: number;
      btts_prob: number;
      weaker_team_scoring_prob: number;
      confidence: "MEDIUM";
      input_snapshot: { fixtureExternalId: number };
      created_at: string;
    },
    fixtureExternalId: number,
    modelVersion: string,
    fromCache: boolean
  ) => ({
    fixtureId: row.fixture_id,
    fixtureExternalId,
    modelVersionId: row.model_version_id,
    modelVersion,
    predictionId: row.id,
    type: "PREMATCH" as const,
    winProbabilities: {
      home: row.home_win_prob,
      draw: row.draw_prob,
      away: row.away_win_prob,
    },
    expectedGoalsHome: row.expected_goals_home,
    expectedGoalsAway: row.expected_goals_away,
    expectedGoalsTotalMin: row.expected_goals_total_min,
    expectedGoalsTotalMax: row.expected_goals_total_max,
    bttsProb: row.btts_prob,
    weakerTeamScoringProb: row.weaker_team_scoring_prob,
    confidence: row.confidence,
    predictedOutcome: "1" as const,
    inputSnapshot: row.input_snapshot,
    createdAt: row.created_at,
    fromCache,
  }),
}));

vi.mock("@/lib/models/features", () => ({
  buildPrematchFeatures,
  scorePrematchFromFeatures,
}));

describe("predictionService", () => {
  beforeEach(() => {
    resetMemoryLocksForTests();
    vi.clearAllMocks();

    getActiveModelVersion.mockResolvedValue({
      id: "model-1",
      version: "1.0.0",
      coefficients: {},
    });

    resolveFixtureUuidByExternalId.mockResolvedValue({
      id: "fixture-uuid",
      status: "NS",
      kickoff_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    readLatestPrematchPrediction.mockResolvedValue(null);

    buildPrematchFeatures.mockResolvedValue({
      fixtureExternalId: 123,
      asOf: new Date().toISOString(),
      dataQuality: "PARTIAL",
    });

    scorePrematchFromFeatures.mockReturnValue({
      winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
      expectedGoalsHome: 1.5,
      expectedGoalsAway: 1.1,
      expectedGoalsTotalMin: 2,
      expectedGoalsTotalMax: 3,
      bttsProb: 0.52,
      weakerTeamScoringProb: 0.48,
      confidence: "MEDIUM",
      predictedOutcome: "1",
    });

    insertPrematchPrediction.mockImplementation(async () => ({
      id: "prediction-1",
      fixture_id: "fixture-uuid",
      model_version_id: "model-1",
      home_win_prob: 0.5,
      draw_prob: 0.25,
      away_win_prob: 0.25,
      expected_goals_home: 1.5,
      expected_goals_away: 1.1,
      expected_goals_total_min: 2,
      expected_goals_total_max: 3,
      btts_prob: 0.52,
      weaker_team_scoring_prob: 0.48,
      confidence: "MEDIUM",
      input_snapshot: { fixtureExternalId: 123 },
      created_at: new Date().toISOString(),
    }));
  });

  it("returns cached prediction on second call without duplicate insert", async () => {
    const { getOrComputePrematch } =
      await import("@/lib/services/predictionService");

    const first = await getOrComputePrematch(123);
    readLatestPrematchPrediction.mockResolvedValue({
      id: "prediction-1",
      fixture_id: "fixture-uuid",
      model_version_id: "model-1",
      home_win_prob: 0.5,
      draw_prob: 0.25,
      away_win_prob: 0.25,
      expected_goals_home: 1.5,
      expected_goals_away: 1.1,
      expected_goals_total_min: 2,
      expected_goals_total_max: 3,
      btts_prob: 0.52,
      weaker_team_scoring_prob: 0.48,
      confidence: "MEDIUM",
      input_snapshot: { fixtureExternalId: 123 },
      created_at: new Date().toISOString(),
    });

    const second = await getOrComputePrematch(123);

    expect(first?.predictionId).toBe("prediction-1");
    expect(second?.predictionId).toBe("prediction-1");
    expect(insertPrematchPrediction).toHaveBeenCalledTimes(1);
  });

  it("creates only one insert under concurrent requests", async () => {
    let storedRow: {
      id: string;
      fixture_id: string;
      model_version_id: string;
      home_win_prob: number;
      draw_prob: number;
      away_win_prob: number;
      expected_goals_home: number;
      expected_goals_away: number;
      expected_goals_total_min: number;
      expected_goals_total_max: number;
      btts_prob: number;
      weaker_team_scoring_prob: number;
      confidence: "MEDIUM";
      input_snapshot: { fixtureExternalId: number };
      created_at: string;
    } | null = null;

    readLatestPrematchPrediction.mockImplementation(async () => storedRow);

    insertPrematchPrediction.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      storedRow = {
        id: "prediction-1",
        fixture_id: "fixture-uuid",
        model_version_id: "model-1",
        home_win_prob: 0.5,
        draw_prob: 0.25,
        away_win_prob: 0.25,
        expected_goals_home: 1.5,
        expected_goals_away: 1.1,
        expected_goals_total_min: 2,
        expected_goals_total_max: 3,
        btts_prob: 0.52,
        weaker_team_scoring_prob: 0.48,
        confidence: "MEDIUM",
        input_snapshot: { fixtureExternalId: 123 },
        created_at: new Date().toISOString(),
      };
      return storedRow;
    });

    const { getOrComputePrematch } =
      await import("@/lib/services/predictionService");

    const [first, second] = await Promise.all([
      getOrComputePrematch(123),
      getOrComputePrematch(123),
    ]);

    expect(insertPrematchPrediction).toHaveBeenCalledTimes(1);
    expect(first?.predictionId).toBe("prediction-1");
    expect(second?.predictionId).toBe("prediction-1");
  });
});
