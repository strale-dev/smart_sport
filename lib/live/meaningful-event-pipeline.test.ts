import { describe, expect, it, vi, beforeEach } from "vitest";

import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";

const mocks = vi.hoisted(() => ({
  updateLiveProbability: vi.fn(),
  generateLiveInsight: vi.fn(),
  resolveFixtureUuidByExternalId: vi.fn(),
  readLatestLivePrediction: vi.fn(),
  readLatestPrematchPrediction: vi.fn(),
  getActiveModelVersion: vi.fn(),
  readLatestLiveInsight: vi.fn(),
  isLiveInsightGenerationInBackoff: vi.fn(),
  readStoredLiveInsightContext: vi.fn(),
  shouldRunPeriodicLiveInsight: vi.fn(),
}));

vi.mock("@/lib/services/predictionService", () => ({
  updateLiveProbability: mocks.updateLiveProbability,
}));

vi.mock("@/lib/services/aiService", () => ({
  generateLiveInsight: mocks.generateLiveInsight,
}));

vi.mock("@/lib/ai/db", () => ({
  readLatestLiveInsight: mocks.readLatestLiveInsight,
}));

vi.mock("@/lib/live/live-insight-schedule", () => ({
  isLiveInsightGenerationInBackoff: mocks.isLiveInsightGenerationInBackoff,
  markLiveInsightGenerationBackoff: vi.fn(),
  readStoredLiveInsightContext: mocks.readStoredLiveInsightContext,
  shouldRunPeriodicLiveInsight: mocks.shouldRunPeriodicLiveInsight,
  snapshotLiveContext: vi.fn(),
  writeStoredLiveInsightContext: vi.fn(),
}));

vi.mock("@/lib/predictions/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/predictions/db")>();
  return {
    ...actual,
    resolveFixtureUuidByExternalId: mocks.resolveFixtureUuidByExternalId,
    readLatestLivePrediction: mocks.readLatestLivePrediction,
    readLatestPrematchPrediction: mocks.readLatestPrematchPrediction,
    getActiveModelVersion: mocks.getActiveModelVersion,
  };
});

import { runMeaningfulEventPipeline } from "@/lib/live/meaningful-event-pipeline";

const {
  updateLiveProbability,
  generateLiveInsight,
  resolveFixtureUuidByExternalId,
  readLatestLivePrediction,
  readLatestPrematchPrediction,
  getActiveModelVersion,
  readLatestLiveInsight,
  isLiveInsightGenerationInBackoff,
  readStoredLiveInsightContext,
  shouldRunPeriodicLiveInsight,
} = mocks;

function snapshot(
  partial: Partial<LiveDetectorSnapshot> &
    Pick<LiveDetectorSnapshot, "fixtureProviderId">
): LiveDetectorSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    status: "2H",
    minute: 70,
    homeTeamExternalId: 33,
    awayTeamExternalId: 34,
    score: { home: 2, away: 0 },
    events: [],
    stats: [
      { teamExternalId: 33, expectedGoals: 2.1, redCards: 0 },
      { teamExternalId: 34, expectedGoals: 0.4, redCards: 0 },
    ],
    starterExternalIds: [],
    ...partial,
  };
}

describe("runMeaningfulEventPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveModelVersion.mockResolvedValue({
      id: "model-1",
      version: "1.0.0",
      coefficients: {},
    });
    resolveFixtureUuidByExternalId.mockResolvedValue({
      id: "fixture-uuid",
      status: "2H",
      kickoff_at: "2026-09-12T12:00:00.000Z",
    });
    readLatestLivePrediction.mockResolvedValue(null);
    readLatestPrematchPrediction.mockResolvedValue({
      id: "pred-1",
      fixture_id: "fixture-uuid",
      model_version_id: "model-1",
      home_win_prob: 0.55,
      draw_prob: 0.25,
      away_win_prob: 0.2,
      expected_goals_home: 1.4,
      expected_goals_away: 1.0,
      expected_goals_total_min: 2,
      expected_goals_total_max: 3,
      btts_prob: 0.5,
      weaker_team_scoring_prob: 0.35,
      confidence: "MEDIUM",
      input_snapshot: { fixtureExternalId: 1, dataQuality: "PARTIAL" },
      created_at: new Date().toISOString(),
    });
    readLatestLiveInsight.mockResolvedValue({
      id: "insight-1",
      created_at: new Date().toISOString(),
    });
    isLiveInsightGenerationInBackoff.mockResolvedValue(false);
    readStoredLiveInsightContext.mockResolvedValue(null);
    shouldRunPeriodicLiveInsight.mockReturnValue(false);
    updateLiveProbability.mockResolvedValue({
      predictionId: "live-1",
      modelVersion: "1.0.0",
      winProbabilities: { home: 0.82, draw: 0.12, away: 0.06 },
    });
    generateLiveInsight.mockResolvedValue({
      ok: true,
      contextHash: "abc",
      cached: false,
    });
  });

  it("skips persistence when no discrete events and no probability shift", async () => {
    readLatestPrematchPrediction.mockResolvedValue({
      id: "pred-1",
      fixture_id: "fixture-uuid",
      model_version_id: "model-1",
      home_win_prob: 0.45,
      draw_prob: 0.3,
      away_win_prob: 0.25,
      expected_goals_home: 1.4,
      expected_goals_away: 1.0,
      expected_goals_total_min: 2,
      expected_goals_total_max: 3,
      btts_prob: 0.5,
      weaker_team_scoring_prob: 0.35,
      confidence: "MEDIUM",
      input_snapshot: { fixtureExternalId: 1, dataQuality: "PARTIAL" },
      created_at: new Date().toISOString(),
    });

    const result = await runMeaningfulEventPipeline({
      fixtureProviderId: 1,
      prevSnapshot: snapshot({
        fixtureProviderId: 1,
        score: { home: 0, away: 0 },
      }),
      nextSnapshot: snapshot({
        fixtureProviderId: 1,
        score: { home: 0, away: 0 },
        minute: 10,
      }),
    });

    expect(result.livePredictionUpdated).toBe(false);
    expect(updateLiveProbability).not.toHaveBeenCalled();
  });

  it("generates LIVE_BASELINE on first tick when no live insight exists", async () => {
    readLatestLiveInsight.mockResolvedValue(null);

    const result = await runMeaningfulEventPipeline({
      fixtureProviderId: 1,
      prevSnapshot: null,
      nextSnapshot: snapshot({
        fixtureProviderId: 1,
        status: "1H",
        score: { home: 0, away: 0 },
        minute: 1,
      }),
    });

    expect(result.livePredictionUpdated).toBe(true);
    expect(generateLiveInsight).toHaveBeenCalledTimes(1);
    expect(generateLiveInsight).toHaveBeenCalledWith(
      expect.objectContaining({
        meaningfulTriggers: ["LIVE_BASELINE"],
      })
    );
    expect(result.broadcastEvents.some((e) => e.kind === "LIVE_BASELINE")).toBe(
      true
    );
  });

  it("runs live prediction and AI when discrete meaningful events exist", async () => {
    const prev = snapshot({
      fixtureProviderId: 1,
      score: { home: 0, away: 0 },
      events: [],
    });
    const next = snapshot({
      fixtureProviderId: 1,
      score: { home: 1, away: 0 },
      events: [
        {
          externalEventId: "goal-1",
          type: "Goal",
          detail: "Normal Goal",
          comments: null,
          minute: 50,
          teamExternalId: 33,
          playerExternalId: 9,
          assistPlayerExternalId: null,
        },
      ],
    });

    const result = await runMeaningfulEventPipeline({
      fixtureProviderId: 1,
      prevSnapshot: prev,
      nextSnapshot: next,
    });

    expect(result.livePredictionUpdated).toBe(true);
    expect(updateLiveProbability).toHaveBeenCalledTimes(1);
    expect(generateLiveInsight).toHaveBeenCalledTimes(1);
  });

  it("returns NO_LIVE_BASELINE when live prediction cannot be computed", async () => {
    readLatestLiveInsight.mockResolvedValue(null);
    updateLiveProbability.mockResolvedValue(null);

    const result = await runMeaningfulEventPipeline({
      fixtureProviderId: 1,
      prevSnapshot: null,
      nextSnapshot: snapshot({
        fixtureProviderId: 1,
        status: "1H",
        score: { home: 0, away: 0 },
        minute: 3,
      }),
    });

    expect(result.liveInsightGenerated).toBe(false);
    expect(result.liveInsightSkipReason).toBe("NO_LIVE_BASELINE");
  });
});
