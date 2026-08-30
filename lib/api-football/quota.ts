import * as Sentry from "@sentry/nextjs";

import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import { getRedis } from "@/lib/redis/client";

export type QuotaSnapshot = {
  dayRemaining: number | null;
  minuteRemaining: number | null;
  isLowBudget: boolean;
  updatedAt: string;
};

type QuotaStore = {
  dayRemaining: number | null;
  minuteRemaining: number | null;
};

const inMemoryQuota: QuotaStore = {
  dayRemaining: null,
  minuteRemaining: null,
};

let hasReportedLowBudget = false;

function parseRemainingHeader(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isLowBudget(snapshot: QuotaSnapshot): boolean {
  const { lowBudgetThresholdRatio, defaultDailyLimit } =
    API_FOOTBALL_CONFIG.quota;

  if (snapshot.dayRemaining === null) {
    return false;
  }

  return snapshot.dayRemaining / defaultDailyLimit <= lowBudgetThresholdRatio;
}

function reportLowBudgetIfNeeded(snapshot: QuotaSnapshot): void {
  if (!snapshot.isLowBudget || hasReportedLowBudget) {
    return;
  }

  hasReportedLowBudget = true;
  Sentry.captureMessage("API-Football daily quota is low", {
    level: "warning",
    extra: {
      dayRemaining: snapshot.dayRemaining,
      minuteRemaining: snapshot.minuteRemaining,
      dailyLimit: API_FOOTBALL_CONFIG.quota.defaultDailyLimit,
    },
  });
}

function getDayKey(date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `${API_FOOTBALL_CONFIG.quota.dayKeyPrefix}${day}`;
}

function getMinuteKey(date = new Date()): string {
  const minute = date.toISOString().slice(0, 16);
  return `${API_FOOTBALL_CONFIG.quota.minuteKeyPrefix}${minute}`;
}

export async function recordQuotaFromHeaders(
  headers: Headers,
  date = new Date()
): Promise<QuotaSnapshot> {
  const dayRemaining = parseRemainingHeader(
    headers.get("x-ratelimit-requests-remaining") ??
      headers.get("X-RateLimit-Remaining")
  );
  const minuteRemaining = parseRemainingHeader(
    headers.get("x-ratelimit-remaining") ??
      headers.get("X-RateLimit-Remaining-Minute")
  );

  inMemoryQuota.dayRemaining = dayRemaining;
  inMemoryQuota.minuteRemaining = minuteRemaining;

  const redis = getRedis();
  if (redis) {
    const ttlSeconds = 86_400;
    if (dayRemaining !== null) {
      await redis.set(getDayKey(date), dayRemaining, { ex: ttlSeconds });
    }
    if (minuteRemaining !== null) {
      await redis.set(getMinuteKey(date), minuteRemaining, { ex: 120 });
    }
  }

  const snapshot: QuotaSnapshot = {
    dayRemaining,
    minuteRemaining,
    isLowBudget: false,
    updatedAt: date.toISOString(),
  };
  snapshot.isLowBudget = isLowBudget(snapshot);
  reportLowBudgetIfNeeded(snapshot);

  return snapshot;
}

export function getInMemoryQuotaSnapshot(date = new Date()): QuotaSnapshot {
  const snapshot: QuotaSnapshot = {
    dayRemaining: inMemoryQuota.dayRemaining,
    minuteRemaining: inMemoryQuota.minuteRemaining,
    isLowBudget: false,
    updatedAt: date.toISOString(),
  };
  snapshot.isLowBudget = isLowBudget(snapshot);
  reportLowBudgetIfNeeded(snapshot);
  return snapshot;
}

export function resetInMemoryQuotaForTests(): void {
  inMemoryQuota.dayRemaining = null;
  inMemoryQuota.minuteRemaining = null;
  hasReportedLowBudget = false;
}

export function shouldRefuseNonCriticalRequest(
  snapshot: QuotaSnapshot
): boolean {
  return snapshot.isLowBudget;
}
