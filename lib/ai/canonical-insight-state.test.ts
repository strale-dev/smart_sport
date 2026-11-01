import { describe, expect, it } from "vitest";

import { resolveCanonicalPrematchInsightState } from "@/lib/ai/canonical-insight-state";
import type { PrematchInsightResponse } from "@/lib/ai/schemas";

const baseInsight = {
  id: "i1",
  fixtureExternalId: 1,
  fixtureId: "uuid",
  predictionId: "p1",
  contextHash: "h1",
  openaiModel: "gpt-4o-mini",
  promptVersion: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  cached: true,
  summary: "Test",
  advantage: "HOME" as const,
  winOutcome: "1" as const,
  winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
  expectedGoalsRange: [2, 3] as [number, number],
  weakerTeamScoringChance: 0.3,
  confidence: "MEDIUM" as const,
  keyFactors: [],
  scenarios: { likely: "a", best: "b", upset: "c" },
  commentary: "Arsenal look strong.",
  dataUsed: [],
  dataTimestamp: "2026-01-01T00:00:00.000Z",
  dataQuality: "PARTIAL" as const,
  dataCoverage: null,
  analysis: null,
};

describe("resolveCanonicalPrematchInsightState", () => {
  it("maps AI context not ready UNAVAILABLE", () => {
    const response: PrematchInsightResponse = {
      status: "UNAVAILABLE",
      fixtureExternalId: 1,
      reason: "AI_CONTEXT_NOT_READY",
    };
    const resolved = resolveCanonicalPrematchInsightState({
      response,
      hookState: "unavailable",
      fixturePhase: "PREMATCH",
      isGenerating: false,
    });
    expect(resolved.canonicalState).toBe("UNAVAILABLE");
    expect(resolved.reasonCode).toBe("AI_CONTEXT_NOT_READY");
  });

  it("maps MISS with gates to GENERATION_PENDING", () => {
    const response: PrematchInsightResponse = {
      status: "MISS",
      fixtureExternalId: 1,
    };
    const resolved = resolveCanonicalPrematchInsightState({
      response,
      hookState: "generating",
      fixturePhase: "PREMATCH",
      isGenerating: false,
      aiGenerationAllowed: true,
      aiContextReady: true,
    });
    expect(resolved.canonicalState).toBe("GENERATION_PENDING");
  });

  it("maps OK with generationFailure overlay", () => {
    const response: PrematchInsightResponse = {
      status: "OK",
      insight: baseInsight,
      prediction: null,
      cached: true,
      insightMode: "prematch",
      contextStale: true,
      generationFailure: {
        code: "OPENAI_TIMEOUT",
        message: "Timed out",
      },
    };
    const resolved = resolveCanonicalPrematchInsightState({
      response,
      hookState: "ok",
      fixturePhase: "PREMATCH",
      isGenerating: false,
    });
    expect(resolved.canonicalState).toBe("AVAILABLE");
    expect(resolved.generationFailure?.code).toBe("OPENAI_TIMEOUT");
    expect(resolved.contextStale).toBe(true);
  });

  it("maps GENERATION_FAILED response", () => {
    const response = {
      status: "GENERATION_FAILED" as const,
      fixtureExternalId: 1,
      prediction: {} as never,
      message: "fail",
      reasonCode: "OPENAI_PROVIDER_ERROR" as const,
    };
    const resolved = resolveCanonicalPrematchInsightState({
      response,
      hookState: "fallback",
      fixturePhase: "PREMATCH",
      isGenerating: false,
    });
    expect(resolved.canonicalState).toBe("GENERATION_FAILED");
  });
});
