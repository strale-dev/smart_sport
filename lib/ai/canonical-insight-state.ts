import type { PrematchInsightHookState } from "@/lib/ai/prematch-insight-state";
import type {
  PrematchInsightResponse,
  StoredAIInsight,
} from "@/lib/ai/schemas";
import type { FixturePhase } from "@/lib/ai/status-map";

export type CanonicalInsightState =
  | "NOT_READY"
  | "UNAVAILABLE"
  | "GENERATION_PENDING"
  | "GENERATION_FAILED"
  | "AVAILABLE";

export type AiInsightReasonCode =
  | "LOADING"
  | "AI_CONTEXT_NOT_READY"
  | "READINESS_NOT_MET"
  | "STALE_CONTEXT_HASH"
  | "NO_STORED_INSIGHT"
  | "FIXTURE_NOT_ANALYZABLE"
  | "GENERATION_NOT_ALLOWED"
  | "OPENAI_NOT_CONFIGURED"
  | "OPENAI_TIMEOUT"
  | "OPENAI_PROVIDER_ERROR"
  | "MALFORMED_OUTPUT"
  | "RATE_LIMIT"
  | "DAILY_LIMIT"
  | "GENERATION_CONCURRENT"
  | "NETWORK_ERROR"
  | "GUEST_FORBIDDEN"
  | "UNKNOWN";

export type GenerationFailureInfo = {
  code: AiInsightReasonCode;
  message: string;
};

export type ResolvedCanonicalPrematchState = {
  canonicalState: CanonicalInsightState;
  reasonCode: AiInsightReasonCode;
  insight: StoredAIInsight | null;
  contextStale: boolean;
  generationFailure: GenerationFailureInfo | null;
};

export type ResolveCanonicalInput = {
  response: PrematchInsightResponse | null;
  hookState: PrematchInsightHookState;
  fixturePhase: FixturePhase;
  isGenerating: boolean;
  readinessLoading?: boolean;
  aiGenerationAllowed?: boolean;
  aiContextReady?: boolean;
};

function unavailableReasonToCode(
  reason: string | undefined
): AiInsightReasonCode {
  switch (reason) {
    case "FIXTURE_NOT_ANALYZABLE":
      return "FIXTURE_NOT_ANALYZABLE";
    case "NO_STORED_INSIGHT":
      return "NO_STORED_INSIGHT";
    case "STALE_PREMATCH_CONTEXT":
      return "STALE_CONTEXT_HASH";
    case "AI_CONTEXT_NOT_READY":
      return "AI_CONTEXT_NOT_READY";
    case "READINESS_NOT_MET":
      return "READINESS_NOT_MET";
    case "GENERATION_NOT_ALLOWED":
      return "GENERATION_NOT_ALLOWED";
    default:
      return "GENERATION_NOT_ALLOWED";
  }
}

export function resolveCanonicalPrematchInsightState(
  input: ResolveCanonicalInput
): ResolvedCanonicalPrematchState {
  const base: ResolvedCanonicalPrematchState = {
    canonicalState: "NOT_READY",
    reasonCode: "LOADING",
    insight: null,
    contextStale: false,
    generationFailure: null,
  };

  if (input.hookState === "guest") {
    return {
      ...base,
      canonicalState: "UNAVAILABLE",
      reasonCode: "GUEST_FORBIDDEN",
    };
  }

  if (input.hookState === "neither") {
    return {
      ...base,
      canonicalState: "UNAVAILABLE",
      reasonCode: "FIXTURE_NOT_ANALYZABLE",
    };
  }

  if (
    input.readinessLoading ||
    input.hookState === "loading" ||
    !input.response
  ) {
    return base;
  }

  const response = input.response;

  if (response.status === "GUEST_FORBIDDEN") {
    return {
      ...base,
      canonicalState: "UNAVAILABLE",
      reasonCode: "GUEST_FORBIDDEN",
    };
  }

  if (response.status === "AI_LIMIT_REACHED") {
    return {
      ...base,
      canonicalState: "UNAVAILABLE",
      reasonCode: "DAILY_LIMIT",
    };
  }

  if (response.status === "UNAVAILABLE") {
    return {
      ...base,
      canonicalState: "UNAVAILABLE",
      reasonCode: unavailableReasonToCode(response.reason),
    };
  }

  if (response.status === "GENERATION_FAILED") {
    const failure: GenerationFailureInfo = {
      code: response.reasonCode ?? "OPENAI_PROVIDER_ERROR",
      message: response.message,
    };
    return {
      canonicalState: "GENERATION_FAILED",
      reasonCode: failure.code,
      insight: null,
      contextStale: false,
      generationFailure: failure,
    };
  }

  if (response.status === "FALLBACK") {
    return {
      canonicalState: "GENERATION_FAILED",
      reasonCode: "OPENAI_PROVIDER_ERROR",
      insight: null,
      contextStale: false,
      generationFailure: {
        code: "OPENAI_PROVIDER_ERROR",
        message: response.message,
      },
    };
  }

  if (response.status === "MISS") {
    const canAttempt =
      input.aiGenerationAllowed === true && input.aiContextReady === true;
    if (input.isGenerating || canAttempt) {
      return {
        ...base,
        canonicalState: "GENERATION_PENDING",
        reasonCode: canAttempt
          ? "GENERATION_NOT_ALLOWED"
          : "AI_CONTEXT_NOT_READY",
      };
    }
    return {
      ...base,
      canonicalState: "NOT_READY",
      reasonCode:
        input.aiContextReady === false
          ? "AI_CONTEXT_NOT_READY"
          : "READINESS_NOT_MET",
    };
  }

  if (response.status === "OK") {
    const contextStale = response.contextStale === true;
    const failure = response.generationFailure ?? null;
    if (failure) {
      return {
        canonicalState: "AVAILABLE",
        reasonCode: failure.code,
        insight: response.insight,
        contextStale,
        generationFailure: failure,
      };
    }
    if (contextStale && input.isGenerating) {
      return {
        canonicalState: "GENERATION_PENDING",
        reasonCode: "STALE_CONTEXT_HASH",
        insight: response.insight,
        contextStale: true,
        generationFailure: null,
      };
    }
    return {
      canonicalState: "AVAILABLE",
      reasonCode: contextStale ? "STALE_CONTEXT_HASH" : "LOADING",
      insight: response.insight,
      contextStale,
      generationFailure: null,
    };
  }

  if (input.hookState === "error") {
    return {
      ...base,
      canonicalState: "GENERATION_FAILED",
      reasonCode: "NETWORK_ERROR",
      generationFailure: {
        code: "NETWORK_ERROR",
        message: "Failed to load or generate AI insight.",
      },
    };
  }

  return base;
}

export function mapCanonicalToHookState(
  resolved: ResolvedCanonicalPrematchState,
  response: PrematchInsightResponse | null
): PrematchInsightHookState {
  if (response?.status === "OK") {
    return "ok";
  }
  if (response?.status === "MISS") {
    return response.prediction ? "generating" : "miss";
  }
  if (response?.status === "UNAVAILABLE") {
    return "unavailable";
  }
  if (
    response?.status === "FALLBACK" ||
    response?.status === "GENERATION_FAILED"
  ) {
    return "fallback";
  }
  if (response?.status === "AI_LIMIT_REACHED") {
    return "limit";
  }
  if (response?.status === "GUEST_FORBIDDEN") {
    return "guest";
  }

  switch (resolved.canonicalState) {
    case "GENERATION_PENDING":
      return "generating";
    case "GENERATION_FAILED":
      return "fallback";
    case "UNAVAILABLE":
      return "unavailable";
    case "NOT_READY":
      return "loading";
    case "AVAILABLE":
      return "ok";
    default:
      return "loading";
  }
}
