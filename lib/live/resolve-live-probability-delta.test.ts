import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveLiveProbabilityDelta } from "@/lib/live/resolve-live-probability-delta";

const mocks = vi.hoisted(() => ({
  resolveLiveFixtureStateByExternalId: vi.fn(),
  readOfficialPrematchPrediction: vi.fn(),
  readLatestPrematchPrediction: vi.fn(),
  readLatestLivePrediction: vi.fn(),
  mapPrematchPredictionRowForFixture: vi.fn(),
  mapLivePredictionRowToResult: vi.fn(),
  getActiveModelVersion: vi.fn(),
  updateLiveProbability: vi.fn(),
  buildLiveDetectorSnapshot: vi.fn(),
  isLivePollingEnabled: vi.fn(),
}));

vi.mock("@/lib/predictions/db", () => ({
  resolveLiveFixtureStateByExternalId:
    mocks.resolveLiveFixtureStateByExternalId,
  readOfficialPrematchPrediction: mocks.readOfficialPrematchPrediction,
  readLatestPrematchPrediction: mocks.readLatestPrematchPrediction,
  readLatestLivePrediction: mocks.readLatestLivePrediction,
  mapPrematchPredictionRowForFixture: mocks.mapPrematchPredictionRowForFixture,
  mapLivePredictionRowToResult: mocks.mapLivePredictionRowToResult,
  getActiveModelVersion: mocks.getActiveModelVersion,
}));

vi.mock("@/lib/services/predictionService", () => ({
  updateLiveProbability: mocks.updateLiveProbability,
}));

vi.mock("@/lib/live/detector-snapshot", () => ({
  buildLiveDetectorSnapshot: mocks.buildLiveDetectorSnapshot,
}));

vi.mock("@/lib/env", () => ({
  isLivePollingEnabled: mocks.isLivePollingEnabled,
}));

describe("resolveLiveProbabilityDelta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveModelVersion.mockResolvedValue({ version: "1.0.0" });
    mocks.readOfficialPrematchPrediction.mockResolvedValue(null);
    mocks.readLatestPrematchPrediction.mockResolvedValue(null);
    mocks.mapPrematchPredictionRowForFixture.mockResolvedValue(null);
    mocks.isLivePollingEnabled.mockReturnValue(false);
  });

  it("does not expose stale LIVE probabilities when score mismatches fixture", async () => {
    mocks.resolveLiveFixtureStateByExternalId.mockResolvedValue({
      id: "uuid",
      providerId: 42,
      status: "2H",
      kickoff_at: "2026-09-07T17:00:00.000Z",
      minute: 75,
      scoreHome: 2,
      scoreAway: 0,
      lastProviderSyncAt: new Date().toISOString(),
    });

    mocks.readLatestLivePrediction.mockResolvedValue({
      id: "live-row",
      minute: 15,
      input_snapshot: {
        fixtureExternalId: 42,
        minute: 15,
        scoreHome: 0,
        scoreAway: 0,
      },
    });

    mocks.mapLivePredictionRowToResult.mockReturnValue({
      fixtureExternalId: 42,
      minute: 15,
      winProbabilities: { home: 0.93, draw: 0.05, away: 0.02 },
      inputSnapshot: {
        fixtureExternalId: 42,
        asOf: "2026-09-07T17:20:00.000Z",
        minute: 15,
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
        anchorWinProbabilities: { home: 0.93, draw: 0.05, away: 0.02 },
        priorWinProbabilities: { home: 0.93, draw: 0.05, away: 0.02 },
        dataQuality: "PARTIAL",
      },
      liveSnapshotId: "stale",
      predictionId: "pred-stale",
      createdAt: "2026-09-07T17:20:01.000Z",
    });

    const resolved = await resolveLiveProbabilityDelta(42);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.body.live).toBeNull();
      expect(resolved.body.liveAvailable).toBe(false);
      expect(resolved.body.unavailableReason).toBe("LIVE_POLLING_DISABLED");
      expect(resolved.body.livePrediction).toBeNull();
    }
  });
});
