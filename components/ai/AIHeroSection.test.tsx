// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AIHeroSection } from "@/components/ai/AIHeroSection";
import type { AIInsightContextValue } from "@/components/ai/AIInsightProvider";
import { createEmptyPrematchInsightViewModel } from "@/lib/ai/prematch-insight-state";
import { resolvePrematchDisplayExperience } from "@/lib/ai/prematch-availability";

const homeTeam = { name: "Home FC", code: "HOM" };
const awayTeam = { name: "Away FC", code: "AWY" };

function buildContext(
  partial: Partial<AIInsightContextValue>
): AIInsightContextValue {
  const baseVm = createEmptyPrematchInsightViewModel("NS");
  const displayExperience = resolvePrematchDisplayExperience({
    kickoffAt: new Date(Date.now() + 3_600_000).toISOString(),
    fixturePhase: baseVm.fixturePhase,
    hookState: baseVm.state,
    hasInsight: false,
    prediction: null,
  });

  return {
    ...baseVm,
    displayExperience,
    generate: vi.fn(),
    refetch: vi.fn(),
    isGenerating: false,
    aiUiState: "AI_LOADING",
    aiUiCopy: {
      title: "Loading AI analysis",
      description: "Fetching prediction and AI commentary for this fixture.",
      showSkeleton: true,
      showRetry: false,
    },
    liveDelta: undefined,
    ...partial,
  };
}

vi.mock("@/components/ai/AIInsightProvider", () => ({
  usePrematchInsight: vi.fn(),
}));

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";

describe("AIHeroSection", () => {
  it("shows skeleton when AI_LOADING with showSkeleton", () => {
    vi.mocked(usePrematchInsight).mockReturnValue(
      buildContext({
        aiUiState: "AI_LOADING",
        aiUiCopy: {
          title: "Loading",
          description: null,
          showSkeleton: true,
          showRetry: false,
        },
        state: "loading",
      })
    );

    const { container } = render(
      <AIHeroSection
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        returnTo="/matches/1"
      />
    );

    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows postponed copy for neither fixtures", () => {
    vi.mocked(usePrematchInsight).mockReturnValue(
      buildContext({
        state: "neither",
        fixturePhase: "NEITHER",
        aiUiState: "AI_UNAVAILABLE",
        aiUiCopy: {
          title: "Analysis not available",
          description:
            "This fixture was postponed, cancelled, or otherwise removed from analysis.",
          showSkeleton: false,
          showRetry: false,
        },
      })
    );

    render(
      <AIHeroSection
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        returnTo="/matches/1"
      />
    );

    expect(screen.getByText("Analysis not available")).toBeInTheDocument();
    expect(screen.getByText(/postponed, cancelled/)).toBeInTheDocument();
  });

  it("shows narrative card when AI_READY", () => {
    vi.mocked(usePrematchInsight).mockReturnValue(
      buildContext({
        state: "ok",
        aiUiState: "AI_READY",
        aiUiCopy: {
          title: "AI match analysis",
          description: null,
          showSkeleton: false,
          showRetry: false,
        },
        insight: {
          id: "ins-1",
          fixtureExternalId: 1,
          fixtureId: "uuid",
          predictionId: "p1",
          contextHash: "h",
          openaiModel: "gpt",
          promptVersion: "1",
          createdAt: "2026-01-01T00:00:00.000Z",
          cached: true,
          summary: "Home edge expected.",
          advantage: "HOME",
          winOutcome: "1",
          winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
          expectedGoalsRange: [2, 3],
          weakerTeamScoringChance: 0.2,
          confidence: "MEDIUM",
          keyFactors: [],
          scenarios: { likely: "a", best: "b", upset: "c" },
          commentary: "Commentary",
          dataUsed: [],
          dataTimestamp: "2026-01-01T00:00:00.000Z",
          dataQuality: "PARTIAL",
          dataCoverage: null,
          analysis: null,
        },
        insightMode: "prematch",
        displayExperience: {
          ...resolvePrematchDisplayExperience({
            kickoffAt: new Date(Date.now() + 3_600_000).toISOString(),
            fixturePhase: "PREMATCH",
            hookState: "ok",
            hasInsight: true,
            prediction: null,
          }),
          showNarrative: true,
        },
      })
    );

    render(
      <AIHeroSection
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        returnTo="/matches/1"
      />
    );

    expect(screen.getByText("Home edge expected.")).toBeInTheDocument();
  });

  it("shows generation failure notice on ready card", () => {
    vi.mocked(usePrematchInsight).mockReturnValue(
      buildContext({
        state: "ok",
        aiUiState: "AI_READY",
        generationFailureMessage: "Timed out refreshing analysis.",
        aiUiCopy: {
          title: "AI match analysis",
          description: "Timed out refreshing analysis.",
          showSkeleton: false,
          showRetry: true,
        },
        insight: {
          id: "ins-1",
          fixtureExternalId: 1,
          fixtureId: "uuid",
          predictionId: "p1",
          contextHash: "h",
          openaiModel: "gpt",
          promptVersion: "1",
          createdAt: "2026-01-01T00:00:00.000Z",
          cached: true,
          summary: "Prior valid insight.",
          advantage: "HOME",
          winOutcome: "1",
          winProbabilities: { home: 0.5, draw: 0.25, away: 0.25 },
          expectedGoalsRange: [2, 3],
          weakerTeamScoringChance: 0.2,
          confidence: "MEDIUM",
          keyFactors: [],
          scenarios: { likely: "a", best: "b", upset: "c" },
          commentary: "Commentary",
          dataUsed: [],
          dataTimestamp: "2026-01-01T00:00:00.000Z",
          dataQuality: "PARTIAL",
          dataCoverage: null,
          analysis: null,
        },
        insightMode: "prematch",
        displayExperience: {
          ...resolvePrematchDisplayExperience({
            kickoffAt: new Date(Date.now() + 3_600_000).toISOString(),
            fixturePhase: "PREMATCH",
            hookState: "ok",
            hasInsight: true,
            prediction: null,
          }),
          showNarrative: true,
        },
      })
    );

    render(
      <AIHeroSection
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        returnTo="/matches/1"
      />
    );

    expect(screen.getByText("Prior valid insight.")).toBeInTheDocument();
    expect(
      screen.getByText("Timed out refreshing analysis.")
    ).toBeInTheDocument();
    expect(screen.getByText("Update failed")).toBeInTheDocument();
  });

  it("shows live model block without mislabeling prematch card", () => {
    vi.mocked(usePrematchInsight).mockReturnValue(
      buildContext({
        state: "fallback",
        fixturePhase: "LIVE",
        aiUiState: "AI_LOADING",
        aiUiCopy: {
          title: "Preparing analysis",
          description: "Live commentary updates after key moments.",
          showSkeleton: false,
          showRetry: false,
        },
        liveWinProbabilities: { home: 0.6, draw: 0.2, away: 0.2 },
        prediction: {
          type: "PREMATCH",
          presentationKind: "PRE_MATCH_PROBABILITY",
          predictionId: "p1",
          fixtureId: "",
          fixtureExternalId: 1,
          modelVersionId: "",
          modelVersion: "v1",
          modelTier: "FIXTURE_SPECIFIC",
          inputSnapshotFingerprint: "",
          expectedGoalsAvailable: true,
          winProbabilities: { home: 0.4, draw: 0.3, away: 0.3 },
          expectedGoalsHome: 1.2,
          expectedGoalsAway: 1.1,
          expectedGoalsTotal: 2.3,
          expectedGoalsTotalMin: 2,
          expectedGoalsTotalMax: 3,
          over2Prob: 0.5,
          over3Prob: 0.2,
          under2Prob: 0.5,
          bttsProb: 0.5,
          weakerTeamScoringProb: 0.3,
          confidence: "MEDIUM",
          predictedOutcome: "1",
          inputSnapshot: {} as never,
          createdAt: "2026-01-01T00:00:00.000Z",
          fromCache: true,
        },
        displayExperience: {
          tier: "model_only",
          headline: null,
          description: null,
          showModelPrediction: true,
          showNarrative: false,
          shouldAutoGenerateNarrative: false,
        },
      })
    );

    render(
      <AIHeroSection
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        returnTo="/matches/1"
      />
    );

    expect(screen.getByText("Live model")).toBeInTheDocument();
    expect(screen.getByText("Model probabilities")).toBeInTheDocument();
  });
});
