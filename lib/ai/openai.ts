import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import pRetry from "p-retry";

import { getOpenAiModelDefault, hasOpenAiConfig } from "@/lib/env";
import {
  AIInsightOpenAiSchema,
  normalizeAndValidateAIInsight,
} from "@/lib/ai/schemas";

export class OpenAiNotConfiguredError extends Error {
  readonly code = "OPENAI_NOT_CONFIGURED" as const;

  constructor() {
    super(
      "OPENAI_API_KEY is not configured. Add it to .env.local before generating AI insights."
    );
    this.name = "OpenAiNotConfiguredError";
  }
}

export class OpenAiGenerationError extends Error {
  readonly code = "OPENAI_GENERATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "OpenAiGenerationError";
  }
}

export type StructuredInsightResult = {
  parsed: import("@/lib/ai/schemas").AIInsightPayload;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  model: string;
  rawOutput: Record<string, unknown>;
};

let cachedClient: OpenAI | undefined;

function getOpenAiClient(): OpenAI {
  if (!hasOpenAiConfig()) {
    throw new OpenAiNotConfiguredError();
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 0,
    });
  }

  return cachedClient;
}

function isTransientOpenAiError(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) {
    return false;
  }

  return (
    error.status === 429 ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

function estimateCostUsd(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number {
  if (model.includes("gpt-4o-mini")) {
    return (tokensInput / 1_000_000) * 0.15 + (tokensOutput / 1_000_000) * 0.6;
  }

  if (model.includes("gpt-4o")) {
    return (tokensInput / 1_000_000) * 2.5 + (tokensOutput / 1_000_000) * 10;
  }

  return 0;
}

export async function generateStructuredInsight(input: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<StructuredInsightResult> {
  const model = input.model ?? getOpenAiModelDefault();

  return pRetry(
    async () => {
      const client = getOpenAiClient();
      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        response_format: zodResponseFormat(AIInsightOpenAiSchema, "ai_insight"),
      });

      const message = completion.choices[0]?.message;
      if (!message?.parsed) {
        const refusal = message?.refusal ?? "unknown";
        throw new OpenAiGenerationError(
          `OpenAI returned no parsed insight (${refusal})`
        );
      }

      const parsed = normalizeAndValidateAIInsight(message.parsed);

      const tokensInput = completion.usage?.prompt_tokens ?? 0;
      const tokensOutput = completion.usage?.completion_tokens ?? 0;

      return {
        parsed,
        tokensInput,
        tokensOutput,
        costUsd: estimateCostUsd(model, tokensInput, tokensOutput),
        model,
        rawOutput: parsed as unknown as Record<string, unknown>,
      };
    },
    {
      retries: 1,
      shouldRetry: ({ error }) => isTransientOpenAiError(error),
    }
  );
}

export function resetOpenAiClientForTests(): void {
  cachedClient = undefined;
}
