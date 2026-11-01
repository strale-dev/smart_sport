import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import {
  getInMemoryQuotaSnapshot,
  hydrateQuotaFromRedis,
  recordQuotaFromHeaders,
  resetInMemoryQuotaForTests,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";

const getRedisMock = vi.hoisted(() => vi.fn<() => unknown>(() => null));

vi.mock("@/lib/redis/client", () => ({
  getRedis: () => getRedisMock(),
  resetRedisClientForTests: () => undefined,
  pingRedis: async () => false,
}));

describe("quota tracker", () => {
  beforeEach(() => {
    resetInMemoryQuotaForTests();
    getRedisMock.mockReturnValue(null);
    process.env.API_FOOTBALL_DAILY_LIMIT = "7500";
  });

  it("marks low budget when remaining quota is below threshold", async () => {
    const threshold =
      API_FOOTBALL_CONFIG.quota.defaultDailyLimit *
      API_FOOTBALL_CONFIG.quota.lowBudgetThresholdRatio;

    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": String(Math.floor(threshold)),
      })
    );

    const snapshot = getInMemoryQuotaSnapshot();
    expect(snapshot.isLowBudget).toBe(true);
    expect(shouldRefuseNonCriticalRequest(snapshot)).toBe(true);
  });

  it("logs low-budget warning and refuses requests when quota is exhausted", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": "0",
      })
    );

    const snapshot = getInMemoryQuotaSnapshot();
    expect(snapshot.dayRemaining).toBe(0);
    expect(snapshot.isLowBudget).toBe(true);
    expect(shouldRefuseNonCriticalRequest(snapshot)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[api-football] daily quota is low",
      expect.objectContaining({ dayRemaining: 0 })
    );

    warnSpy.mockRestore();
  });

  it("continues with in-memory quota when Redis hydrate fails", async () => {
    getRedisMock.mockReturnValue({
      get: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
      set: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });

    await expect(hydrateQuotaFromRedis()).resolves.toBeUndefined();
    expect(getInMemoryQuotaSnapshot().dayRemaining).toBeNull();
  });

  it("allows critical traffic when budget is healthy", async () => {
    await recordQuotaFromHeaders(
      new Headers({
        "x-ratelimit-requests-remaining": "6000",
      })
    );

    const snapshot = getInMemoryQuotaSnapshot();
    expect(snapshot.isLowBudget).toBe(false);
    expect(shouldRefuseNonCriticalRequest(snapshot)).toBe(false);
  });
});
