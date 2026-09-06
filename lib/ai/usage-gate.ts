import { readAiUsage, incrementAiUsage } from "@/lib/ai/db";
import { getFreeTierAiPredictionsPerDay } from "@/lib/env";

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

export function getAiDailyLimit(): number {
  return getFreeTierAiPredictionsPerDay();
}

export async function getAiUsageStatus(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const limit = getAiDailyLimit();
  const used = await readAiUsage(userId);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export async function assertCanGenerateAi(userId: string): Promise<void> {
  const limit = getAiDailyLimit();
  const used = await readAiUsage(userId);

  if (used >= limit) {
    throw new AiLimitReachedError(limit, used);
  }
}

export async function recordAiGeneration(userId: string): Promise<number> {
  return incrementAiUsage(userId);
}
