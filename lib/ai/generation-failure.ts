import { ZodError } from "zod";

import {
  OpenAiGenerationError,
  OpenAiNotConfiguredError,
} from "@/lib/ai/openai";
import { NarrativeNotFixtureSpecificError } from "@/lib/ai/narrative-fixture-specificity";
import type { AiInsightReasonCode } from "@/lib/ai/canonical-insight-state";
import { LockNotAcquiredError } from "@/lib/redis/lock";
import { AiLimitReachedError } from "@/lib/ai/usage-gate";
import { AiRateLimitUnavailableError } from "@/lib/ai/usage-gate";

export type GenerationFailureDetail = {
  reasonCode: AiInsightReasonCode;
  message: string;
};

export function classifyGenerationFailure(
  error: unknown
): GenerationFailureDetail {
  if (error instanceof OpenAiNotConfiguredError) {
    return {
      reasonCode: "OPENAI_NOT_CONFIGURED",
      message: "AI narrative generation is not configured.",
    };
  }

  if (error instanceof AiLimitReachedError) {
    return {
      reasonCode: "DAILY_LIMIT",
      message: "Daily AI generation limit reached.",
    };
  }

  if (error instanceof AiRateLimitUnavailableError) {
    return {
      reasonCode: "RATE_LIMIT",
      message: "AI rate limiting is temporarily unavailable.",
    };
  }

  if (error instanceof LockNotAcquiredError) {
    return {
      reasonCode: "GENERATION_CONCURRENT",
      message: "Another generation is in progress for this fixture.",
    };
  }

  if (error instanceof ZodError) {
    return {
      reasonCode: "MALFORMED_OUTPUT",
      message: "AI output did not match the expected format.",
    };
  }

  if (error instanceof NarrativeNotFixtureSpecificError) {
    return {
      reasonCode: "MALFORMED_OUTPUT",
      message: "AI narrative was too generic for this fixture.",
    };
  }

  if (error instanceof OpenAiGenerationError) {
    const lower = error.message.toLowerCase();
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return {
        reasonCode: "OPENAI_TIMEOUT",
        message: "AI generation timed out.",
      };
    }
    return {
      reasonCode: "OPENAI_PROVIDER_ERROR",
      message: "AI provider failed to generate a narrative.",
    };
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("429") || lower.includes("rate limit")) {
      return {
        reasonCode: "RATE_LIMIT",
        message: "AI provider rate limit reached.",
      };
    }
  }

  return {
    reasonCode: "OPENAI_PROVIDER_ERROR",
    message: "AI generation failed.",
  };
}
