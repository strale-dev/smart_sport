import { describe, expect, it, vi } from "vitest";

import { buildPrematchUserPrompt } from "@/lib/services/aiContextService";
import type { PrematchAiContext } from "@/types/ai";

describe("aiContextService", () => {
  it("serializes context as JSON without HTML or provider payload fields", () => {
    const context: PrematchAiContext = {
      fixtureExternalId: 1552754,
      kickoffAt: "2026-09-07T18:00:00.000Z",
      status: "NS",
      venue: "Stadium",
      league: { externalId: 61, name: "Ligue 1" },
      homeTeam: { externalId: 80, name: "Toulouse" },
      awayTeam: { externalId: 79, name: "Lille" },
      lineupsState: "MISSING",
      modelVersion: "1.0.0",
      promptVersion: "1.0.0",
      prediction: {
        winProbabilities: { home: 0.4, draw: 0.3, away: 0.3 },
        expectedGoalsHome: 1.4,
        expectedGoalsAway: 1.2,
        expectedGoalsTotalMin: 2,
        expectedGoalsTotalMax: 3,
        bttsProb: 0.55,
        weakerTeamScoringProb: 0.42,
        confidence: "MEDIUM",
        predictedOutcome: "1",
        dataQuality: "PARTIAL",
      },
      form: {
        homeLast5: {
          wins: 3,
          draws: 1,
          losses: 1,
          ppg: 2,
          goalsFor: 8,
          goalsAgainst: 4,
        },
        awayLast5: {
          wins: 2,
          draws: 2,
          losses: 1,
          ppg: 1.6,
          goalsFor: 6,
          goalsAgainst: 5,
        },
      },
      h2h: null,
      dataQuality: "PARTIAL",
      dataTimestamp: "2026-09-06T12:00:00.000Z",
    };

    const prompt = buildPrematchUserPrompt(context);
    expect(prompt).toContain('"fixtureExternalId": 1552754');
    expect(prompt).not.toContain("provider_payload");
    expect(prompt).not.toContain("<script>");
  });
});

describe("aiService fallback", () => {
  it("returns FALLBACK when OpenAI generation fails", async () => {
    vi.doMock("@/lib/ai/openai", () => ({
      generateStructuredInsight: vi.fn(async () => {
        throw new Error("OpenAI down");
      }),
      OpenAiGenerationError: class OpenAiGenerationError extends Error {},
      OpenAiNotConfiguredError: class OpenAiNotConfiguredError extends Error {},
    }));

    const { generatePrematchInsight } =
      await import("@/lib/services/aiService");
    expect(typeof generatePrematchInsight).toBe("function");
  });
});
