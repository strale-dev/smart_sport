import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveFixtureUuidByExternalId = vi.fn();
const mockGetOrComputePrematch = vi.fn();
const mockGetLatestPrematch = vi.fn();
const mockBuildPrematchContext = vi.fn();
const mockReadLatestPrematchInsight = vi.fn();
const mockReadPrematchInsightFromStore = vi.fn();

vi.mock("@/lib/predictions/db", () => ({
  resolveFixtureUuidByExternalId: (...args: unknown[]) =>
    mockResolveFixtureUuidByExternalId(...args),
  getActiveModelVersion: vi.fn(),
  readLatestLivePrediction: vi.fn(),
  readLivePredictionById: vi.fn(),
  mapLivePredictionRowToResult: vi.fn(),
  mapPredictionRowToResult: vi.fn(),
  readOfficialPrematchPrediction: vi.fn(),
  readLatestPrematchPrediction: vi.fn(),
}));

vi.mock("@/lib/services/predictionService", () => ({
  getOrComputePrematch: (...args: unknown[]) =>
    mockGetOrComputePrematch(...args),
  getLatestPrematch: (...args: unknown[]) => mockGetLatestPrematch(...args),
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
      row: { id: string },
      fixtureExternalId: number,
      cached: boolean
    ) => ({
      id: row.id,
      fixtureExternalId,
      fixtureId: "fixture-uuid",
      predictionId: null,
      contextHash: "stored-hash",
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
      commentary: "Commentary",
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
  generatePrematchStructuredInsight: vi.fn(),
  generateLiveStructuredInsight: vi.fn(),
  OpenAiNotConfiguredError: class extends Error {},
  OpenAiGenerationError: class extends Error {},
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

import { readPrematchInsight } from "@/lib/services/aiService";

const prematchPrediction = {
  type: "PREMATCH" as const,
  presentationKind: "PRE_MATCH_PROBABILITY" as const,
  modelTier: "FIXTURE_SPECIFIC" as const,
  inputSnapshotFingerprint: "fp",
  expectedGoalsAvailable: true,
  fixtureExternalId: 123,
  predictionId: "pred-1",
  modelVersion: "1.0.0",
  winProbabilities: { home: 0.45, draw: 0.28, away: 0.27 },
  expectedGoalsHome: 1.2,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.3,
  expectedGoalsTotalMin: 2,
  expectedGoalsTotalMax: 3,
  over2Prob: 0.5,
  over3Prob: 0.3,
  bttsProb: 0.55,
  weakerTeamScoringProb: 0.35,
  confidence: "MEDIUM" as const,
  predictedOutcome: "1" as const,
  cached: true,
  inputSnapshot: {
    dataQuality: "PARTIAL" as const,
    form5HomePpg: 1.8,
    form5AwayPpg: 1.6,
    eloDiff: 12,
  },
};

describe("readPrematchInsight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns OK with contextStale when exact hash misses but a latest insight exists (RC-6)", async () => {
    mockResolveFixtureUuidByExternalId.mockResolvedValue({
      id: "fixture-uuid",
      status: "NS",
      kickoff_at: "2026-09-10T18:00:00.000Z",
    });
    mockGetOrComputePrematch.mockResolvedValue(prematchPrediction);
    mockBuildPrematchContext.mockResolvedValue({ contextHash: "hash-new" });
    mockReadPrematchInsightFromStore.mockResolvedValue(null);
    mockReadLatestPrematchInsight.mockResolvedValue({ id: "insight-old" });

    const result = await readPrematchInsight(123);

    expect(result).toMatchObject({
      status: "OK",
      insightMode: "prematch",
      contextStale: true,
      cached: true,
    });
    expect(mockReadLatestPrematchInsight).toHaveBeenCalledWith("fixture-uuid");
  });

  it("returns OK with prediction null when historical insight exists without prediction (RC-7)", async () => {
    mockResolveFixtureUuidByExternalId.mockResolvedValue({
      id: "fixture-uuid",
      status: "FT",
      kickoff_at: "2026-09-01T18:00:00.000Z",
    });
    mockReadLatestPrematchInsight.mockResolvedValue({ id: "insight-hist" });
    mockGetLatestPrematch.mockResolvedValue(null);

    const result = await readPrematchInsight(123);

    expect(result).toMatchObject({
      status: "OK",
      insightMode: "historical",
      prediction: null,
      cached: true,
    });
  });
});
