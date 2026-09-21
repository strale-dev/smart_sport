import { describe, expect, it } from "vitest";

import {
  LIVE_UPDATES_HINT,
  resolveLivePhaseViewModel,
} from "@/lib/ai/live-insight-state";
import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import type { LiveProbabilityDeltaResponse } from "@/lib/live/live-probability-delta";
import type { PrematchPredictionResult } from "@/types/prediction";

const prediction = {
  type: "PREMATCH",
  fixtureExternalId: 123,
} as PrematchPredictionResult;

const deltaWithLive = {
  prematch: { home: 0.4, draw: 0.3, away: 0.3 },
  live: { home: 0.55, draw: 0.25, away: 0.2 },
  liveMinute: 67,
  prematchPrediction: {
    predictionId: "p1",
    modelVersion: "v1",
    createdAt: "2026-01-01T00:00:00.000Z",
    winProbabilities: { home: 0.4, draw: 0.3, away: 0.3 },
    predictedOutcome: "1",
    expectedGoalsRange: [2, 3],
    weakerTeamScoringChance: 0.3,
    confidence: "MEDIUM",
  },
} satisfies LiveProbabilityDeltaResponse;

describe("resolveLivePhaseViewModel", () => {
  it("shows fallback with delta while live insight GET is still pending", () => {
    const historical: PrematchInsightResponse = {
      status: "MISS",
      fixtureExternalId: 123,
      prediction,
    };

    const vm = resolveLivePhaseViewModel({
      fixtureId: 123,
      fixtureStatus: "2H",
      liveInsightData: undefined,
      liveInsightError: null,
      liveInsightPending: true,
      historicalPrematchData: historical,
      historicalPrematchPending: false,
      liveDelta: deltaWithLive,
    });

    expect(vm.state).toBe("fallback");
    expect(vm.liveWinProbabilities).toEqual(deltaWithLive.live);
    expect(vm.fallbackMessage).toBe(LIVE_UPDATES_HINT);
  });

  it("shows historical ok while live insight is still pending", () => {
    const historical: PrematchInsightResponse = {
      status: "OK",
      insight: {
        id: "i1",
        fixtureExternalId: 123,
        fixtureId: "uuid",
        predictionId: "p1",
        contextHash: "h",
        openaiModel: "gpt",
        promptVersion: "1",
        createdAt: "2026-01-01T00:00:00.000Z",
        cached: true,
        summary: "Summary",
        advantage: "HOME",
        winOutcome: "1",
        winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
        expectedGoalsRange: [2, 3],
        weakerTeamScoringChance: 0.3,
        confidence: "MEDIUM",
        keyFactors: [],
        scenarios: { likely: "a", best: "b", upset: "c" },
        commentary: "c",
        dataUsed: [],
        dataTimestamp: "2026-01-01T00:00:00.000Z",
        dataQuality: "COMPLETE",
        dataCoverage: null,
        analysis: null,
      },
      prediction,
      cached: true,
      insightMode: "historical",
    };

    const vm = resolveLivePhaseViewModel({
      fixtureId: 123,
      fixtureStatus: "2H",
      liveInsightData: undefined,
      liveInsightError: null,
      liveInsightPending: true,
      historicalPrematchData: historical,
      historicalPrematchPending: false,
      liveDelta: deltaWithLive,
    });

    expect(vm.state).toBe("ok");
    expect(vm.fallbackMessage).toBe(LIVE_UPDATES_HINT);
  });

  it("uses loading only when no partial data and queries pending", () => {
    const vm = resolveLivePhaseViewModel({
      fixtureId: 123,
      fixtureStatus: "2H",
      liveInsightData: undefined,
      liveInsightError: null,
      liveInsightPending: true,
      historicalPrematchData: undefined,
      historicalPrematchPending: true,
      liveDelta: undefined,
    });

    expect(vm.state).toBe("loading");
  });

  it("prefers delta over error when live insight fetch fails", () => {
    const historical: PrematchInsightResponse = {
      status: "MISS",
      fixtureExternalId: 123,
      prediction,
    };

    const vm = resolveLivePhaseViewModel({
      fixtureId: 123,
      fixtureStatus: "2H",
      liveInsightData: undefined,
      liveInsightError: new Error("network"),
      liveInsightPending: false,
      historicalPrematchData: historical,
      historicalPrematchPending: false,
      liveDelta: deltaWithLive,
    });

    expect(vm.state).toBe("fallback");
    expect(vm.errorMessage).toBeNull();
  });
});
