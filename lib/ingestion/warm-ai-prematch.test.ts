import { describe, expect, it, vi } from "vitest";

import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import {
  evaluateNullWarmReadinessRows,
  isAiGenerationAllowedFromRow,
  selectNarrativeWarmProviderIds,
  selectPredictionWarmProviderIds,
  selectWarmCandidateProviderIds,
  warmWindowBoundsForScope,
  type WarmWorkItem,
} from "@/lib/ingestion/warm-ai-prematch";

const { evaluateAndPersistFixtureReadiness } = vi.hoisted(() => ({
  evaluateAndPersistFixtureReadiness: vi.fn(),
}));

vi.mock("@/lib/fixtures/readiness/persist", () => ({
  evaluateAndPersistFixtureReadiness,
}));

describe("warmWindowBoundsForScope", () => {
  const now = Date.parse("2026-03-21T12:00:00.000Z");

  it("daily scope covers the next 36 hours from now", () => {
    const { from, to } = warmWindowBoundsForScope("daily", now);
    expect(from).toBe("2026-03-21T12:00:00.000Z");
    expect(to).toBe("2026-03-23T00:00:00.000Z");
  });

  it("imminent scope covers the next 90 minutes from now", () => {
    const { from, to } = warmWindowBoundsForScope("imminent", now);
    expect(from).toBe("2026-03-21T12:00:00.000Z");
    expect(to).toBe("2026-03-21T13:30:00.000Z");
  });

  it("backfill scope covers the previous 14 days through now", () => {
    const { from, to } = warmWindowBoundsForScope("backfill", now);
    expect(from).toBe("2026-03-07T12:00:00.000Z");
    expect(to).toBe("2026-03-21T12:00:00.000Z");
  });
});

describe("evaluateNullWarmReadinessRows", () => {
  it("evaluates null readiness rows and enables warm filter", async () => {
    evaluateAndPersistFixtureReadiness.mockResolvedValue({
      gates: { aiGenerationAllowed: true },
    });

    const row = {
      provider_id: 1558652,
      kickoff_at: "2026-10-12T15:00:00.000Z",
      fixture_readiness: null,
    };

    const { rows, evaluated } = await evaluateNullWarmReadinessRows([row], 10);

    expect(evaluated).toBe(1);
    expect(evaluateAndPersistFixtureReadiness).toHaveBeenCalledWith({
      providerId: 1558652,
    });
    expect(isAiGenerationAllowedFromRow(rows[0])).toBe(true);
  });
});

describe("selectWarmCandidateProviderIds", () => {
  it("keeps NS fixtures that are prediction-ready even when generation is not yet allowed", () => {
    const ids = selectWarmCandidateProviderIds(
      [
        {
          provider_id: 1557453,
          kickoff_at: "2026-11-01T16:30:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: false, predictionReady: true },
          } as never,
        },
        {
          provider_id: 1550183,
          kickoff_at: "2026-11-01T14:00:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: false, predictionReady: true },
          } as never,
        },
      ],
      40
    );

    expect(ids).toEqual([1550183, 1557453]);
  });

  it("prefers already-allowed fixtures, then earlier kickoff", () => {
    const ids = selectWarmCandidateProviderIds(
      [
        {
          provider_id: 2,
          kickoff_at: "2026-11-01T12:00:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: false, predictionReady: true },
          } as never,
        },
        {
          provider_id: 1,
          kickoff_at: "2026-11-01T18:00:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: true, predictionReady: true },
          } as never,
        },
      ],
      2
    );

    expect(ids[0]).toBe(1);
    expect(ids[1]).toBe(2);
  });

  it("skips fixtures that already have a current prematch insight", () => {
    const ids = selectWarmCandidateProviderIds(
      [
        {
          provider_id: 10,
          kickoff_at: "2026-11-01T12:00:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: false, predictionReady: true },
            artifacts: {
              aiPrematch: {
                insightId: "insight-1",
                matchesCurrentInputs: true,
                stale: false,
              },
            },
          } as never,
        },
        {
          provider_id: 11,
          kickoff_at: "2026-11-01T13:00:00.000Z",
          fixture_readiness: {
            gates: { aiGenerationAllowed: false, predictionReady: true },
          } as never,
        },
      ],
      40
    );

    expect(ids).toEqual([11]);
  });
});

describe("warm work selection", () => {
  const items: WarmWorkItem[] = [
    {
      providerId: 1,
      kickoffAt: "2026-11-11T18:00:00.000Z",
      band: "daily",
      hasPrediction: true,
      specific: true,
      hasInsight: false,
    },
    {
      providerId: 2,
      kickoffAt: "2026-11-11T12:30:00.000Z",
      band: "imminent",
      hasPrediction: false,
      specific: false,
      hasInsight: false,
    },
    {
      providerId: 3,
      kickoffAt: "2026-11-11T12:00:00.000Z",
      band: "imminent",
      hasPrediction: true,
      specific: false,
      hasInsight: false,
    },
    {
      providerId: 4,
      kickoffAt: "2026-11-10T20:00:00.000Z",
      band: "backfill",
      hasPrediction: true,
      specific: true,
      hasInsight: false,
    },
    {
      providerId: 5,
      kickoffAt: "2026-11-11T13:00:00.000Z",
      band: "imminent",
      hasPrediction: true,
      specific: true,
      hasInsight: true,
    },
    {
      providerId: 6,
      kickoffAt: "2026-11-11T14:00:00.000Z",
      band: "imminent",
      hasPrediction: true,
      specific: true,
      hasInsight: false,
    },
  ];

  it("writes predictions for upcoming fixtures that do not have one yet", () => {
    expect(selectPredictionWarmProviderIds(items, 10)).toEqual([2]);
  });

  it("sends only specific fixtures without an insight to the LLM, imminent first", () => {
    expect(selectNarrativeWarmProviderIds(items, 10)).toEqual([6, 1, 4]);
  });
});

describe("warm cron outcome semantics", () => {
  it("treats LLM fallback as a failed warm unit", () => {
    expect(resolveCronOutcome({ failedCount: 1 })).toEqual({
      ok: false,
      degraded: true,
    });
  });

  it("does not treat expected unavailability as cron failure", () => {
    const unavailable = 5;
    const fallback = 0;
    const errors = 0;
    expect(resolveCronOutcome({ failedCount: fallback + errors })).toEqual({
      ok: true,
    });
    expect(unavailable).toBeGreaterThan(0);
  });
});
