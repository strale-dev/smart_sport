import OpenAI from "openai";
import { ZodError } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import pRetry from "p-retry";

import { repairInsightNarrativeEvidence } from "@/lib/ai/sanitize-prematch-narrative";
import { getOpenAiModelDefault, hasOpenAiConfig } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import {
  AIInsightLiveOpenAiResponseSchema,
  AIInsightPrematchOpenAiResponseSchema,
  validateAIInsightLiveNarrative,
  validateAIInsightPrematchNarrative,
  type AIInsightLiveNarrativePayload,
  type AIInsightPrematchNarrativePayload,
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

export type StructuredInsightResult<T> = {
  parsed: T;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  model: string;
  rawOutput: Record<string, unknown>;
};

let cachedClient: OpenAI | undefined;

function resolveOpenAiApiKey(): string | undefined {
  return getServerEnv().OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
}

function getOpenAiClient(): OpenAI {
  const apiKey = resolveOpenAiApiKey();
  if (!hasOpenAiConfig() || !apiKey) {
    throw new OpenAiNotConfiguredError();
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey,
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
}): Promise<StructuredInsightResult<AIInsightLiveNarrativePayload>> {
  return generateLiveStructuredInsight(input);
}

export async function generateLiveStructuredInsight(input: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<StructuredInsightResult<AIInsightLiveNarrativePayload>> {
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
        response_format: zodResponseFormat(
          AIInsightLiveOpenAiResponseSchema,
          "ai_insight_live_narrative"
        ),
      });

      const message = completion.choices[0]?.message;
      if (!message?.parsed) {
        const refusal = message?.refusal ?? "unknown";
        throw new OpenAiGenerationError(
          `OpenAI returned no parsed insight (${refusal})`
        );
      }

      const raw = AIInsightLiveOpenAiResponseSchema.parse(message.parsed);
      const parsed = validateAIInsightLiveNarrative(
        repairInsightNarrativeEvidence(raw, input.userPrompt)
      );

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
      shouldRetry: ({ error }) =>
        isTransientOpenAiError(error) || error instanceof ZodError,
    }
  );
}

export async function generatePrematchStructuredInsight(input: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<StructuredInsightResult<AIInsightPrematchNarrativePayload>> {
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
        response_format: zodResponseFormat(
          AIInsightPrematchOpenAiResponseSchema,
          "ai_insight_prematch_narrative"
        ),
      });

      const message = completion.choices[0]?.message;
      if (!message?.parsed) {
        const refusal = message?.refusal ?? "unknown";
        throw new OpenAiGenerationError(
          `OpenAI returned no parsed prematch insight (${refusal})`
        );
      }

      const raw = AIInsightPrematchOpenAiResponseSchema.parse(message.parsed);
      const parsed = validateAIInsightPrematchNarrative(
        repairInsightNarrativeEvidence(raw, input.userPrompt)
      );

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
      shouldRetry: ({ error }) =>
        isTransientOpenAiError(error) || error instanceof ZodError,
    }
  );
}

export function resetOpenAiClientForTests(): void {
  cachedClient = undefined;
}
