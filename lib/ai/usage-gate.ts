import * as Sentry from "@sentry/nextjs";

import { readAiUsage, incrementAiUsage } from "@/lib/ai/db";
import { getFreeTierAiPredictionsPerDay } from "@/lib/env";
import { env } from "@/lib/env.server";
import {
  AiRateLimitUnavailableError,
  consumeAiGeneration,
  getAiRateLimitStatus,
  isAiRateLimitAvailable,
} from "@/lib/ratelimit/ai";

export { AiRateLimitUnavailableError } from "@/lib/ratelimit/ai";

export class AiLimitReachedError extends Error {
  readonly code = "AI_LIMIT_REACHED" as const;
  readonly limit: number;
  readonly used: number;

  constructor(limit: number, used: number) {
    super("Daily AI prediction limit reached");
    this.name = "AiLimitReachedError";
    this.limit = limit;
    this.used = used;
  }
}

function isProduction(): boolean {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

export function getAiDailyLimit(): number {
  return getFreeTierAiPredictionsPerDay();
}

async function assertCanGenerateAiViaPostgres(userId: string): Promise<void> {
  const limit = getAiDailyLimit();
  const used = await readAiUsage(userId);

  if (used >= limit) {
    throw new AiLimitReachedError(limit, used);
  }
}

export async function getAiUsageStatus(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const limit = getAiDailyLimit();

  if (isAiRateLimitAvailable()) {
    const status = await getAiRateLimitStatus(userId);
    if (status) {
      return status;
    }
  }

  if (!isProduction()) {
    const used = await readAiUsage(userId);
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }

  throw new AiRateLimitUnavailableError();
}

export async function assertCanGenerateAi(userId: string): Promise<void> {
  if (isAiRateLimitAvailable()) {
    const status = await getAiRateLimitStatus(userId);
    if (!status) {
      if (isProduction()) {
        throw new AiRateLimitUnavailableError();
      }

      await assertCanGenerateAiViaPostgres(userId);
      return;
    }

    if (status.remaining <= 0) {
      throw new AiLimitReachedError(status.limit, status.used);
    }

    return;
  }

  if (isProduction()) {
    throw new AiRateLimitUnavailableError();
  }

  console.warn(
    "[usage-gate] Redis is not configured — falling back to Postgres AI usage in development."
  );
  await assertCanGenerateAiViaPostgres(userId);
}

export async function recordAiGeneration(userId: string): Promise<number> {
  const pgCount = await incrementAiUsage(userId);

  if (isAiRateLimitAvailable()) {
    try {
      await consumeAiGeneration(userId);
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        "[usage-gate] Redis consume failed after successful generation:",
        error
      );
    }
  }

  return pgCount;
}
