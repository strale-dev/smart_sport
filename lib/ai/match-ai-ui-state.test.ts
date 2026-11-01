import { describe, expect, it } from "vitest";

import type {
  AiInsightReasonCode,
  ResolvedCanonicalPrematchState,
} from "@/lib/ai/canonical-insight-state";
import {
  describeMatchAiUiState,
  formatLivePredictionUnavailableReason,
  inferMatchAiReasonCode,
  resolveMatchAiUiState,
  type MatchAiUiCopy,
  type MatchAiUiState,
} from "@/lib/ai/match-ai-ui-state";
import type { FixturePhase } from "@/lib/ai/status-map";
import type { LivePredictionUnavailableReason } from "@/lib/predictions/live-prediction-validation";

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

const AI_REASON_CODES = [
  "LOADING",
  "AI_CONTEXT_NOT_READY",
  "READINESS_NOT_MET",
  "STALE_CONTEXT_HASH",
  "NO_STORED_INSIGHT",
  "FIXTURE_NOT_ANALYZABLE",
  "GENERATION_NOT_ALLOWED",
  "OPENAI_NOT_CONFIGURED",
  "OPENAI_TIMEOUT",
  "OPENAI_PROVIDER_ERROR",
  "MALFORMED_OUTPUT",
  "RATE_LIMIT",
  "DAILY_LIMIT",
  "GENERATION_CONCURRENT",
  "NETWORK_ERROR",
  "GUEST_FORBIDDEN",
  "UNKNOWN",
] as const satisfies readonly AiInsightReasonCode[];

const LIVE_UNAVAILABLE_REASONS = [
  "FIXTURE_ID_MISMATCH",
  "SCORE_MISMATCH",
  "MINUTE_BEHIND",
  "STATUS_MISMATCH",
  "SCORE_UNAVAILABLE",
  "NO_LIVE_PREDICTION",
  "LIVE_POLLING_DISABLED",
] as const satisfies readonly LivePredictionUnavailableReason[];

const MATCH_AI_UI_STATES = [
  "AI_READY",
  "AI_LOADING",
  "AI_NOT_READY",
  "AI_UNAVAILABLE",
  "AI_FAILED",
  "NO_DATA",
] as const satisfies readonly MatchAiUiState[];

const FIXTURE_PHASES = [
  "PREMATCH",
  "LIVE",
  "FINISHED",
  "NEITHER",
] as const satisfies readonly FixturePhase[];

function expectExplicitCopy(copy: MatchAiUiCopy) {
  expect(copy.title.trim().length).toBeGreaterThan(0);
  expect(typeof copy.description).toBe("string");
  expect(copy.description?.trim().length).toBeGreaterThan(0);
}

describe("describeMatchAiUiState", () => {
  it("AI_FAILED offers retry off live phase", () => {
    const live = describeMatchAiUiState({
      state: "AI_FAILED",
      fixturePhase: "LIVE",
    });
    expect(live.showRetry).toBe(false);
    expectExplicitCopy(live);

    const pre = describeMatchAiUiState({
      state: "AI_FAILED",
      fixturePhase: "PREMATCH",
    });
    expect(pre.showRetry).toBe(true);
    expectExplicitCopy(pre);
  });

  it("AI_UNAVAILABLE uses live reason when provided", () => {
    const copy = describeMatchAiUiState({
      state: "AI_UNAVAILABLE",
      fixturePhase: "LIVE",
      liveUnavailableReason: "SCORE_MISMATCH",
    });
    expect(copy.description).toContain("score on the pitch");
    expectExplicitCopy(copy);
  });

  it("returns non-empty title and description for every MatchAiUiState", () => {
    for (const state of MATCH_AI_UI_STATES) {
      for (const fixturePhase of FIXTURE_PHASES) {
        expectExplicitCopy(
          describeMatchAiUiState({
            state,
            fixturePhase,
          })
        );
      }
    }
  });

  it("returns non-empty title and description for every reasonCode", () => {
    const states: MatchAiUiState[] = [
      "AI_NOT_READY",
      "AI_UNAVAILABLE",
      "NO_DATA",
      "AI_FAILED",
    ];

    for (const reasonCode of AI_REASON_CODES) {
      for (const state of states) {
        const copy = describeMatchAiUiState({
          state,
          fixturePhase: "PREMATCH",
          reasonCode,
        });
        expectExplicitCopy(copy);
        expect(copy.title).not.toBe("");
        expect(copy.description).not.toBe(
          "AI commentary is not available for this fixture."
        );
      }
    }
  });

  it("returns non-empty title and description for every liveUnavailableReason", () => {
    const states: MatchAiUiState[] = ["AI_UNAVAILABLE", "NO_DATA"];

    for (const liveUnavailableReason of LIVE_UNAVAILABLE_REASONS) {
      for (const state of states) {
        const copy = describeMatchAiUiState({
          state,
          fixturePhase: "LIVE",
          liveUnavailableReason,
        });
        expectExplicitCopy(copy);
        expect(copy.description).toBe(
          formatLivePredictionUnavailableReason(liveUnavailableReason)
        );
      }
    }
  });

  it("READINESS_NOT_MET uses the readiness title and description", () => {
    const copy = describeMatchAiUiState({
      state: "AI_NOT_READY",
      fixturePhase: "PREMATCH",
      reasonCode: "READINESS_NOT_MET",
    });
    expect(copy.title).toBe("Not enough data yet");
    expect(copy.description).toMatch(/more reliable inputs/i);
  });

  it("NO_STORED_INSIGHT is explicit for finished fixtures", () => {
    const copy = describeMatchAiUiState({
      state: "NO_DATA",
      fixturePhase: "FINISHED",
      reasonCode: "NO_STORED_INSIGHT",
    });
    expect(copy.title).toMatch(/stored/i);
    expect(copy.description).toMatch(/saved AI narrative|stored/i);
    expectExplicitCopy(copy);
  });

  it("GENERATION_NOT_ALLOWED mentions the generation window", () => {
    const copy = describeMatchAiUiState({
      state: "AI_UNAVAILABLE",
      fixturePhase: "PREMATCH",
      reasonCode: "GENERATION_NOT_ALLOWED",
    });
    expect(copy.title).toMatch(/not offered|window/i);
    expect(copy.description).toMatch(/36-hour|window|policy/i);
    expectExplicitCopy(copy);
  });

  it("LIVE_POLLING_DISABLED is explicit on live NO_DATA", () => {
    const copy = describeMatchAiUiState({
      state: "NO_DATA",
      fixturePhase: "LIVE",
      liveUnavailableReason: "LIVE_POLLING_DISABLED",
    });
    expect(copy.title.trim().length).toBeGreaterThan(0);
    expect(copy.description).toMatch(/live updates are temporarily disabled/i);
  });

  it("live without stored insight does not use a silent generic fallback", () => {
    const copy = describeMatchAiUiState({
      state: "NO_DATA",
      fixturePhase: "LIVE",
    });
    expectExplicitCopy(copy);
    expect(copy.description).toMatch(/pre-match|stored|baseline/i);
  });

  it("guest, limit, and error reasons stay explicit", () => {
    const guest = describeMatchAiUiState({
      state: "AI_UNAVAILABLE",
      fixturePhase: "PREMATCH",
      reasonCode: "GUEST_FORBIDDEN",
    });
    expect(guest.title).toMatch(/sign in/i);
    expectExplicitCopy(guest);

    const limit = describeMatchAiUiState({
      state: "AI_UNAVAILABLE",
      fixturePhase: "PREMATCH",
      reasonCode: "DAILY_LIMIT",
    });
    expect(limit.title).toMatch(/daily AI limit/i);
    expectExplicitCopy(limit);

    const error = describeMatchAiUiState({
      state: "AI_FAILED",
      fixturePhase: "PREMATCH",
      reasonCode: "NETWORK_ERROR",
      networkErrorMessage: "Failed to load AI insight",
    });
    expect(error.description).toBe("Failed to load AI insight");
    expectExplicitCopy(error);
  });
});

describe("inferMatchAiReasonCode", () => {
  it("keeps the canonical reason when present", () => {
    expect(
      inferMatchAiReasonCode({
        canonicalReason: "READINESS_NOT_MET",
        isGuest: false,
        hookState: "miss",
        fixturePhase: "PREMATCH",
        hasInsight: false,
      })
    ).toBe("READINESS_NOT_MET");
  });

  it("maps guest, limit, and finished-without-insight", () => {
    expect(
      inferMatchAiReasonCode({
        canonicalReason: null,
        isGuest: true,
        hookState: "guest",
        fixturePhase: "PREMATCH",
        hasInsight: false,
      })
    ).toBe("GUEST_FORBIDDEN");

    expect(
      inferMatchAiReasonCode({
        canonicalReason: null,
        isGuest: false,
        hookState: "limit",
        fixturePhase: "PREMATCH",
        hasInsight: false,
      })
    ).toBe("DAILY_LIMIT");

    expect(
      inferMatchAiReasonCode({
        canonicalReason: null,
        isGuest: false,
        hookState: "miss",
        fixturePhase: "FINISHED",
        hasInsight: false,
      })
    ).toBe("NO_STORED_INSIGHT");

    expect(
      inferMatchAiReasonCode({
        canonicalReason: null,
        isGuest: false,
        hookState: "miss",
        fixturePhase: "LIVE",
        hasInsight: false,
      })
    ).toBe("NO_STORED_INSIGHT");
  });
});
