import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import {
  getInMemoryQuotaSnapshot,
  recordQuotaFromHeaders,
  resetInMemoryQuotaForTests,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";

describe("quota tracker", () => {
  beforeEach(() => {
    resetInMemoryQuotaForTests();
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
