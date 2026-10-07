import {
  DEFAULT_API_FOOTBALL_BASE_URL,
  getApiFootballDailyLimit,
  getApiFootballMinuteLimit,
} from "@/lib/env";

export const API_FOOTBALL_CONFIG = {
  baseUrl: DEFAULT_API_FOOTBALL_BASE_URL,
  requestTimeoutMs: 30_000,
  retry: {
    retries: 5,
    minTimeoutMs: 1_000,
    maxTimeoutMs: 30_000,
    factor: 2,
    randomize: true,
  },
  dedup: {
    lockTtlSeconds: 5,
    lockKeyPrefix: "lock:api-football:inflight:",
    lockWaitMs: 2_000,
    lockWaitPollMs: 50,
  },
  quota: {
    dayKeyPrefix: "api-football:quota:day:",
    minuteKeyPrefix: "api-football:quota:minute:",
    lowBudgetThresholdRatio: 0.05,
    get defaultDailyLimit() {
      return getApiFootballDailyLimit();
    },
    get defaultMinuteLimit() {
      return getApiFootballMinuteLimit();
    },
  },
} as const;

export function getApiFootballBaseUrl(envBaseUrl: string | undefined): string {
  return envBaseUrl ?? API_FOOTBALL_CONFIG.baseUrl;
}
