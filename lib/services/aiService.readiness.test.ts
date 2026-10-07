import { beforeEach, describe, expect, it, vi } from "vitest";

const readLatestPrematchInsight = vi.fn();
const getLatestPrematch = vi.fn();
const buildPrematchContext = vi.fn();

vi.mock("@/lib/ai/db", () => ({
  readLatestPrematchInsight,
  readLatestLiveInsight: vi.fn(),
  insertAiInsight: vi.fn(),
}));

vi.mock("@/lib/predictions/db", () => ({
  getActiveModelVersion: vi.fn().mockResolvedValue({ version: "1.0.0" }),
  resolveFixtureUuidByExternalId: vi.fn().mockResolvedValue({
    id: "fixture-uuid",
    status: "FT",
    kickoff_at: "2026-09-20T15:00:00.000Z",
  }),
  readLatestLivePrediction: vi.fn(),
  readLivePredictionById: vi.fn(),
  mapLivePredictionRowToResult: vi.fn(),
  mapPredictionRowToResult: vi.fn(),
}));

vi.mock("@/lib/services/predictionService", () => ({
  getLatestPrematch,
  getOrComputePrematch: vi.fn(),
}));

vi.mock("@/lib/services/aiContextService", () => ({
  buildPrematchContext,
  buildPrematchUserPrompt: vi.fn(),
  buildLiveContext: vi.fn(),
  buildLiveUserPrompt: vi.fn(),
}));

vi.mock("@/lib/ai/cache", () => ({
  readPrematchInsightFromStore: vi.fn(),
  mapAiInsightRowToStored: vi.fn((row, id) => ({
    ...row,
    fixtureExternalId: id,
  })),
  writePrematchInsightCache: vi.fn(),
  writeLiveInsightCache: vi.fn(),
  readLiveInsightFromStore: vi.fn(),
  withPrematchInsightLock: vi.fn((_id, fn) => fn()),
  withLiveInsightLock: vi.fn(),
}));

describe("aiService historical prematch readiness (FR-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLatestPrematch.mockResolvedValue({
      fixtureExternalId: 123,
      predictionId: "p1",
      type: "PREMATCH",
    });
    buildPrematchContext.mockResolvedValue({ contextHash: "current-hash" });
  });

  it("returns UNAVAILABLE when stored insight context hash is stale", async () => {
    readLatestPrematchInsight.mockResolvedValue({
      id: "insight-1",
      context_hash: "stale-hash",
    });

    const { readPrematchInsight } = await import("@/lib/services/aiService");
    const result = await readPrematchInsight(123);

    expect(result.status).toBe("UNAVAILABLE");
    if (result.status === "UNAVAILABLE") {
      expect(result.reason).toBe("STALE_PREMATCH_CONTEXT");
    }
  });
});
