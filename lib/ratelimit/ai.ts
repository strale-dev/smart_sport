import { Ratelimit } from "@upstash/ratelimit";

import { getFreeTierAiPredictionsPerDay } from "@/lib/env";
import { env } from "@/lib/env.server";
import { getRedis } from "@/lib/redis/client";

export class AiRateLimitUnavailableError extends Error {
  readonly code = "RATE_LIMIT_UNAVAILABLE" as const;

  constructor() {
    super("AI rate limiting is unavailable");
    this.name = "AiRateLimitUnavailableError";
  }
}

const AI_RATE_LIMIT_PREFIX = "ratelimit:user";

let aiDailyRateLimit: Ratelimit | null | undefined;

function getAiRateLimitIdentifier(userId: string): string {
  return `${userId}:ai:day`;
}

function getAiDailyRateLimit(): Ratelimit | null {
  if (aiDailyRateLimit !== undefined) {
    return aiDailyRateLimit;
  }

  const redis = getRedis();
  if (!redis) {
    aiDailyRateLimit = null;
    return aiDailyRateLimit;
  }

  aiDailyRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(getFreeTierAiPredictionsPerDay(), "1 d"),
    prefix: AI_RATE_LIMIT_PREFIX,
  });

  return aiDailyRateLimit;
}

function isProduction(): boolean {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}

export function isAiRateLimitAvailable(): boolean {
  return getAiDailyRateLimit() !== null;
}

export type AiRateLimitStatus = {
  limit: number;
  used: number;
  remaining: number;
};

function toStatus(limit: number, remaining: number): AiRateLimitStatus {
  const safeRemaining = Math.max(0, remaining);
  return {
    limit,
    used: Math.max(0, limit - safeRemaining),
    remaining: safeRemaining,
  };
}

export async function getAiRateLimitStatus(
  userId: string
): Promise<AiRateLimitStatus | null> {
  const limiter = getAiDailyRateLimit();
  if (!limiter) {
    return null;
  }

  const { limit, remaining } = await limiter.getRemaining(
    getAiRateLimitIdentifier(userId)
  );

  return toStatus(limit, remaining);
}

export async function consumeAiGeneration(
  userId: string
): Promise<AiRateLimitStatus> {
  const limiter = getAiDailyRateLimit();
  if (!limiter) {
    if (isProduction()) {
      throw new AiRateLimitUnavailableError();
    }

    throw new AiRateLimitUnavailableError();
  }

  const result = await limiter.limit(getAiRateLimitIdentifier(userId));
  return toStatus(result.limit, result.remaining);
}

export function resetAiRateLimitForTests(): void {
  aiDailyRateLimit = undefined;
}
