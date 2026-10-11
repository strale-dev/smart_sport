import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveFixtureUuidByExternalId = vi.fn();
const mockGetOrComputePrematch = vi.fn();
const mockBuildPrematchContext = vi.fn();
const mockReadLatestPrematchInsight = vi.fn();
const mockReadPrematchInsightFromStore = vi.fn();
const mockGeneratePrematchStructuredInsight = vi.fn();
const mockEvaluateFixtureReadinessForProvider = vi.fn();

vi.mock("@/lib/predictions/db", () => ({
  resolveFixtureUuidByExternalId: (...args: unknown[]) =>
    mockResolveFixtureUuidByExternalId(...args),
  getActiveModelVersion: vi.fn(),
  readLatestLivePrediction: vi.fn(),
  readLivePredictionById: vi.fn(),
  mapLivePredictionRowToResult: vi.fn(),
  mapPredictionRowToResult: vi.fn(),
}));

vi.mock("@/lib/services/predictionService", () => ({
  getOrComputePrematch: (...args: unknown[]) =>
    mockGetOrComputePrematch(...args),
  getLatestPrematch: vi.fn(),
}));

vi.mock("@/lib/services/aiContextService", () => ({
  buildPrematchContext: (...args: unknown[]) =>
    mockBuildPrematchContext(...args),
  buildPrematchUserPrompt: vi.fn(),
  buildLiveContext: vi.fn(),
  buildLiveUserPrompt: vi.fn(),
}));

vi.mock("@/lib/ai/db", () => ({
  readLatestPrematchInsight: (...args: unknown[]) =>
    mockReadLatestPrematchInsight(...args),
  readLatestLiveInsight: vi.fn(),
  insertAiInsight: vi.fn(),
}));

vi.mock("@/lib/ai/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/cache")>();
  return {
    ...actual,
    readPrematchInsightFromStore: (...args: unknown[]) =>
      mockReadPrematchInsightFromStore(...args),
    mapAiInsightRowToStored: (
      row: { id: string; context_hash?: string },
      fixtureExternalId: number,
      cached: boolean
    ) => ({
      id: row.id,
      fixtureExternalId,
      fixtureId: "fixture-uuid",
      predictionId: null,
      contextHash: row.context_hash ?? "stored-hash",
      openaiModel: "gpt-4o-mini",
      promptVersion: "1.3.0",
      createdAt: "2026-09-01T00:00:00.000Z",
      cached,
      summary: "Stored narrative",
      advantage: "HOME" as const,
      winOutcome: "1" as const,
      winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
      expectedGoalsRange: [2, 3] as [number, number],
      weakerTeamScoringChance: 0.3,
      confidence: "MEDIUM" as const,
      keyFactors: [],
      scenarios: { likely: "a", best: "b", upset: "c" },
      commentary: "Arsenal enter with an edge.",
      dataUsed: ["Model prediction"],
      dataTimestamp: "2026-09-01T00:00:00.000Z",
      dataQuality: "PARTIAL" as const,
      dataCoverage: null,
      analysis: null,
    }),
    writePrematchInsightCache: vi.fn(),
    writeLiveInsightCache: vi.fn(),
    withPrematchInsightLock: vi.fn(async (_id, fn) => fn()),
    withLiveInsightLock: vi.fn(),
    readLiveInsightFromStore: vi.fn(),
  };
});

vi.mock("@/lib/ai/openai", () => ({
  generatePrematchStructuredInsight: (...args: unknown[]) =>
    mockGeneratePrematchStructuredInsight(...args),
  generateLiveStructuredInsight: vi.fn(),
  OpenAiNotConfiguredError: class extends Error {},
  OpenAiGenerationError: class extends Error {
    code = "OPENAI_GENERATION_FAILED";
  },
}));

vi.mock("@/lib/ai/usage-gate", () => ({
  assertCanGenerateAi: vi.fn(),
  getAiUsageStatus: vi.fn(),
  getAiDailyLimit: vi.fn(),
  recordAiGeneration: vi.fn(),
  AiLimitReachedError: class extends Error {},
  AiRateLimitUnavailableError: class extends Error {},
}));

vi.mock("@/lib/ingestion/ingestion-observability", () => ({
  logIngestionEvent: vi.fn(),
}));

vi.mock("@/lib/fixtures/readiness", () => ({
  evaluateFixtureReadinessForProvider: (...args: unknown[]) =>
    mockEvaluateFixtureReadinessForProvider(...args),
  isAiGenerationAllowed: (snapshot: {
    gates: { aiGenerationAllowed: boolean };
  }) => snapshot.gates.aiGenerationAllowed,
  isAiContextReady: (snapshot: { gates: { aiContextReady: boolean } }) =>
    snapshot.gates.aiContextReady,
  evaluateAndPersistFixtureReadiness: vi.fn(),
}));

import { OpenAiGenerationError } from "@/lib/ai/openai";
import { LockNotAcquiredError } from "@/lib/redis/lock";
import { generatePrematchInsight } from "@/lib/services/aiService";

const prematchPrediction = {
  type: "PREMATCH" as const,
  presentationKind: "PRE_MATCH_PROBABILITY" as const,
  modelTier: "FIXTURE_SPECIFIC" as const,
  inputSnapshotFingerprint: "fp",
  expectedGoalsAvailable: true,
  fixtureExternalId: 123,
  fixtureId: "fixture-uuid",
  predictionId: "pred-1",
  modelVersionId: "mv-1",
  modelVersion: "1.0.0",
  createdAt: "2026-01-01T12:00:00.000Z",
  fromCache: true,
  winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
  predictedOutcome: "1",
  expectedGoalsHome: 1.5,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.6,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  over2Prob: 0.5,
  over3Prob: 0.28,
  bttsProb: 0.52,
  weakerTeamScoringProb: 0.31,
  confidence: "MEDIUM",
  inputSnapshot: {
    dataQuality: "PARTIAL" as const,
    form5HomePpg: 1.8,
    form5AwayPpg: 1.6,
    eloDiff: 12,
  },
};

const readinessOk = {
  version: 1 as const,
  phase: "AI_READY" as const,
  evaluatedAt: "2026-01-01T00:00:00.000Z",
  timezonePolicy: "Europe/Belgrade" as const,
  liveSubState: null,
  gates: {
    predictionReady: true,
    predictionFresh: true,
    aiContextReady: true,
    aiGenerationAllowed: true,
    liveDataCurrent: false,
    historicalDataSufficient: true,
  },
  items: [],
  artifacts: {},
};

describe("generatePrematchInsight failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveFixtureUuidByExternalId.mockResolvedValue({
      id: "fixture-uuid",
      status: "NS",
      kickoff_at: "2026-09-10T18:00:00.000Z",
    });
    mockGetOrComputePrematch.mockResolvedValue(prematchPrediction);
    mockBuildPrematchContext.mockResolvedValue({
      contextHash: "hash-new",
      context: {
        homeTeam: { name: "Arsenal" },
        awayTeam: { name: "Chelsea" },
        dataAvailable: [],
        dataMissing: [],
        promptVersion: "1",
      },
    });
    mockReadPrematchInsightFromStore.mockResolvedValue(null);
    mockEvaluateFixtureReadinessForProvider.mockResolvedValue(readinessOk);
  });

  it("returns UNAVAILABLE when AI context is not ready", async () => {
    mockEvaluateFixtureReadinessForProvider.mockResolvedValue({
      ...readinessOk,
      gates: { ...readinessOk.gates, aiContextReady: false },
    });

    const result = await generatePrematchInsight(123, {
      trigger: "user",
      userId: "user-1",
    });

    expect(result.status).toBe("UNAVAILABLE");
    if (result.status === "UNAVAILABLE") {
      expect(result.reason).toBe("AI_CONTEXT_NOT_READY");
    }
  });

  it("preserves prior insight on generation failure", async () => {
    mockGeneratePrematchStructuredInsight.mockRejectedValue(
      new OpenAiGenerationError("provider down")
    );
    mockReadLatestPrematchInsight.mockResolvedValue({
      id: "insight-old",
      context_hash: "hash-old",
    });

    const result = await generatePrematchInsight(123, {
      trigger: "user",
      userId: "user-1",
    });

    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.insight.id).toBe("insight-old");
      expect(result.contextStale).toBe(true);
      expect(result.generationFailure?.code).toBe("OPENAI_PROVIDER_ERROR");
    }
  });

  it("returns GENERATION_FAILED when no prior insight exists", async () => {
    mockGeneratePrematchStructuredInsight.mockRejectedValue(
      new OpenAiGenerationError("provider down")
    );
    mockReadLatestPrematchInsight.mockResolvedValue(null);

    const result = await generatePrematchInsight(123, {
      trigger: "user",
      userId: "user-1",
    });

    expect(result.status).toBe("GENERATION_FAILED");
  });

  it("surfaces concurrent generation as GENERATION_FAILED", async () => {
    const { withPrematchInsightLock } = await import("@/lib/ai/cache");
    vi.mocked(withPrematchInsightLock).mockRejectedValueOnce(
      new LockNotAcquiredError("lock")
    );

    const result = await generatePrematchInsight(123, {
      trigger: "user",
      userId: "user-1",
    });

    expect(result.status).toBe("GENERATION_FAILED");
    if (result.status === "GENERATION_FAILED") {
      expect(result.reasonCode).toBe("GENERATION_CONCURRENT");
    }
  });
});
