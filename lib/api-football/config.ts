import {
  DEFAULT_API_FOOTBALL_BASE_URL,
  getApiFootballDailyLimit,
} from "@/lib/env";

export const API_FOOTBALL_CONFIG = {
  baseUrl: DEFAULT_API_FOOTBALL_BASE_URL,
  retry: {
    retries: 5,
    minTimeoutMs: 1_000,
    maxTimeoutMs: 30_000,
    factor: 2,
  },
  dedup: {
    lockTtlSeconds: 5,
    lockKeyPrefix: "lock:api-football:inflight:",
  },
  quota: {
    dayKeyPrefix: "api-football:quota:day:",
    minuteKeyPrefix: "api-football:quota:minute:",
    lowBudgetThresholdRatio: 0.05,
    get defaultDailyLimit() {
      return getApiFootballDailyLimit();
    },
    defaultMinuteLimit: 300,
  },
} as const;

export function getApiFootballBaseUrl(envBaseUrl: string | undefined): string {
  return envBaseUrl ?? API_FOOTBALL_CONFIG.baseUrl;
}
