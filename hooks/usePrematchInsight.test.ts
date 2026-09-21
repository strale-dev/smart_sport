import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  __resetPrematchInsightFetchCacheForTests,
  fetchPrematchInsightGet,
  fetchPrematchInsightPost,
} from "@/lib/ai/prematch-insight-fetch";
import {
  mapPrematchInsightResponseToViewModel,
  resolveInitialPrematchInsightState,
} from "@/lib/ai/prematch-insight-state";
import type { PrematchInsightResponse } from "@/lib/ai/schemas";
import { canGeneratePrematchInsight } from "@/lib/ai/status-map";
import type { PrematchPredictionResult } from "@/types/prediction";

const baseInsight = {
  id: "insight-1",
  fixtureExternalId: 123,
  fixtureId: "fixture-uuid",
  predictionId: "pred-1",
  contextHash: "hash",
  openaiModel: "gpt-4o-mini",
  promptVersion: "1.0.0",
  createdAt: "2026-01-01T12:00:00.000Z",
  cached: true,
  summary: "Home side enter with a narrow statistical edge in this fixture.",
  advantage: "HOME" as const,
  winOutcome: "1" as const,
  winProbabilities: { home: 0.48, draw: 0.27, away: 0.25 },
  expectedGoalsRange: [2, 3] as [number, number],
  weakerTeamScoringChance: 0.31,
  confidence: "MEDIUM" as const,
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
    "The model gives the home team a modest edge driven by stronger recent form and home advantage.",
  dataUsed: ["Model prediction", "Team form"],
  dataTimestamp: "2026-01-01T12:00:00.000Z",
  dataQuality: "PARTIAL" as const,
  dataCoverage: null,
  analysis: null,
};

describe("usePrematchInsight support modules", () => {
  beforeEach(() => {
    __resetPrematchInsightFetchCacheForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    __resetPrematchInsightFetchCacheForTests();
  });

  it("resolves initial states for guest, neither, and loading", () => {
    expect(
      resolveInitialPrematchInsightState({ isGuest: true, fixtureStatus: "NS" })
    ).toBe("guest");
    expect(
      resolveInitialPrematchInsightState({
        isGuest: false,
        fixtureStatus: "CANC",
      })
    ).toBe("neither");
    expect(
      resolveInitialPrematchInsightState({
        isGuest: false,
        fixtureStatus: "NS",
      })
    ).toBe("loading");
  });

  it("maps all API responses to hook states", () => {
    expect(
      mapPrematchInsightResponseToViewModel(
        {
          status: "OK",
          insight: baseInsight,
          cached: true,
          insightMode: "prematch",
        },
        "NS"
      ).state
    ).toBe("ok");

    expect(
      mapPrematchInsightResponseToViewModel(
        { status: "MISS", fixtureExternalId: 123 },
        "NS"
      ).state
    ).toBe("miss");

    expect(
      mapPrematchInsightResponseToViewModel(
        { status: "UNAVAILABLE", fixtureExternalId: 123 },
        "FT"
      ).state
    ).toBe("unavailable");

    expect(
      mapPrematchInsightResponseToViewModel(
        {
          status: "FALLBACK",
          fixtureExternalId: 123,
          prediction: {} as PrematchPredictionResult,
          message: "timeout",
        },
        "NS"
      ).state
    ).toBe("fallback");

    expect(
      mapPrematchInsightResponseToViewModel(
        { status: "AI_LIMIT_REACHED", limit: 5, used: 5 },
        "NS"
      ).state
    ).toBe("limit");

    expect(
      mapPrematchInsightResponseToViewModel({ status: "GUEST_FORBIDDEN" }, "NS")
        .state
    ).toBe("guest");
  });

  it("deduplicates GET requests for the same fixture", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        ({
          status: "MISS",
          fixtureExternalId: 123,
        }) satisfies PrematchInsightResponse,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchPrematchInsightGet(123),
      fetchPrematchInsightGet(123),
    ]);

    expect(first.status).toBe("MISS");
    expect(second.status).toBe("MISS");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not POST from fetch helpers unless generate is called", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          ({
            status: "MISS",
            fixtureExternalId: 456,
          }) satisfies PrematchInsightResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          ({
            status: "OK",
            insight: baseInsight,
            cached: false,
            insightMode: "prematch",
          }) satisfies PrematchInsightResponse,
      });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPrematchInsightGet(456);
    await fetchPrematchInsightGet(456);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.every((call) => call[1]?.method !== "POST")
    ).toBe(true);

    await fetchPrematchInsightPost(456);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
  });

  it("blocks generate for non-prematch statuses at the status-map layer", () => {
    expect(canGeneratePrematchInsight("NS")).toBe(true);
    expect(canGeneratePrematchInsight("FT")).toBe(false);
    expect(canGeneratePrematchInsight("CANC")).toBe(false);
  });
});
