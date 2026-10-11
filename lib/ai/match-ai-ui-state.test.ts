import { describe, expect, it } from "vitest";

import type { ResolvedCanonicalPrematchState } from "@/lib/ai/canonical-insight-state";
import {
  describeMatchAiUiState,
  formatLivePredictionUnavailableReason,
  resolveMatchAiUiState,
} from "@/lib/ai/match-ai-ui-state";

function canonical(
  partial: Partial<ResolvedCanonicalPrematchState> &
    Pick<ResolvedCanonicalPrematchState, "canonicalState">
): ResolvedCanonicalPrematchState {
  return {
    reasonCode: "LOADING",
    insight: null,
    contextStale: false,
    generationFailure: null,
    ...partial,
  };
}

describe("formatLivePredictionUnavailableReason", () => {
  it("maps SCORE_MISMATCH to plain language", () => {
    expect(formatLivePredictionUnavailableReason("SCORE_MISMATCH")).toContain(
      "score on the pitch"
    );
  });

  it("maps NO_LIVE_PREDICTION", () => {
    expect(
      formatLivePredictionUnavailableReason("NO_LIVE_PREDICTION")
    ).toContain("in-match model");
  });
});

describe("resolveMatchAiUiState", () => {
  it("maps AVAILABLE with insight to AI_READY", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "PREMATCH",
        hookState: "ok",
        isGuest: false,
        isGenerating: false,
        hasInsight: true,
        hasPrediction: true,
        hasLiveWinProbabilities: false,
        canonical: canonical({ canonicalState: "AVAILABLE" }),
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_READY");
  });

  it("maps GENERATION_PENDING to AI_LOADING", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "PREMATCH",
        hookState: "generating",
        isGuest: false,
        isGenerating: true,
        hasInsight: false,
        hasPrediction: true,
        hasLiveWinProbabilities: false,
        canonical: canonical({ canonicalState: "GENERATION_PENDING" }),
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_LOADING");
  });

  it("maps GENERATION_FAILED without insight to AI_FAILED", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "PREMATCH",
        hookState: "fallback",
        isGuest: false,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: true,
        hasLiveWinProbabilities: false,
        canonical: canonical({
          canonicalState: "GENERATION_FAILED",
          reasonCode: "OPENAI_TIMEOUT",
        }),
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_FAILED");
  });

  it("maps AVAILABLE with generationFailure overlay to AI_READY when insight exists", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "PREMATCH",
        hookState: "ok",
        isGuest: false,
        isGenerating: false,
        hasInsight: true,
        hasPrediction: true,
        hasLiveWinProbabilities: false,
        canonical: canonical({
          canonicalState: "AVAILABLE",
          generationFailure: {
            code: "OPENAI_TIMEOUT",
            message: "Timed out",
          },
        }),
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_READY");
  });

  it("maps NOT_READY readiness to AI_NOT_READY without prediction", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "PREMATCH",
        hookState: "loading",
        isGuest: false,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: false,
        hasLiveWinProbabilities: false,
        canonical: canonical({
          canonicalState: "NOT_READY",
          reasonCode: "READINESS_NOT_MET",
        }),
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_NOT_READY");
  });

  it("maps UNAVAILABLE neither fixture to AI_UNAVAILABLE", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "NEITHER",
        hookState: "neither",
        isGuest: false,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: false,
        hasLiveWinProbabilities: false,
        canonical: null,
        liveInsightStatus: null,
        liveAvailable: null,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_UNAVAILABLE");
  });

  it("live phase fallback with delta uses AI_LOADING not AI_FAILED", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "LIVE",
        hookState: "fallback",
        isGuest: false,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: true,
        hasLiveWinProbabilities: true,
        canonical: null,
        liveInsightStatus: "MISS",
        liveAvailable: true,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_LOADING");
  });

  it("live phase with live unavailable and no prediction uses NO_DATA on miss", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "LIVE",
        hookState: "miss",
        isGuest: false,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: false,
        hasLiveWinProbabilities: false,
        canonical: null,
        liveInsightStatus: "MISS",
        liveAvailable: false,
        liveUnavailableReason: "NO_LIVE_PREDICTION",
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("NO_DATA");
  });

  it("guest with model numbers maps to AI_UNAVAILABLE", () => {
    expect(
      resolveMatchAiUiState({
        fixturePhase: "LIVE",
        hookState: "guest",
        isGuest: true,
        isGenerating: false,
        hasInsight: false,
        hasPrediction: true,
        hasLiveWinProbabilities: true,
        canonical: null,
        liveInsightStatus: null,
        liveAvailable: true,
        liveUnavailableReason: null,
        networkErrorMessage: null,
        dailyLimitReached: false,
      })
    ).toBe("AI_UNAVAILABLE");
  });
});

describe("describeMatchAiUiState", () => {
  it("AI_FAILED offers retry off live phase", () => {
    const live = describeMatchAiUiState({
      state: "AI_FAILED",
      fixturePhase: "LIVE",
    });
    expect(live.showRetry).toBe(false);

    const pre = describeMatchAiUiState({
      state: "AI_FAILED",
      fixturePhase: "PREMATCH",
    });
    expect(pre.showRetry).toBe(true);
  });

  it("AI_UNAVAILABLE uses live reason when provided", () => {
    const copy = describeMatchAiUiState({
      state: "AI_UNAVAILABLE",
      fixturePhase: "LIVE",
      liveUnavailableReason: "SCORE_MISMATCH",
    });
    expect(copy.description).toContain("score on the pitch");
  });
});
