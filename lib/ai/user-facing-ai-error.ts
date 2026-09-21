import { ZodError } from "zod";

import {
  OpenAiGenerationError,
  OpenAiNotConfiguredError,
} from "@/lib/ai/openai";

const GENERIC_NARRATIVE_UNAVAILABLE =
  "The narrative analysis is temporarily unavailable. Model probabilities are shown below.";

export function toUserFacingAiErrorMessage(error: unknown): string {
  if (error instanceof OpenAiNotConfiguredError) {
    return GENERIC_NARRATIVE_UNAVAILABLE;
  }

  if (error instanceof OpenAiGenerationError) {
    return GENERIC_NARRATIVE_UNAVAILABLE;
  }

  if (error instanceof ZodError) {
    return GENERIC_NARRATIVE_UNAVAILABLE;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.startsWith("[") && message.includes('"code"')) {
      return GENERIC_NARRATIVE_UNAVAILABLE;
    }
    if (message.length > 180) {
      return GENERIC_NARRATIVE_UNAVAILABLE;
    }
  }

  return GENERIC_NARRATIVE_UNAVAILABLE;
}
