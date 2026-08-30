import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import {
  getInMemoryQuotaSnapshot,
  recordQuotaFromHeaders,
  resetInMemoryQuotaForTests,
  shouldRefuseNonCriticalRequest,
} from "@/lib/api-football/quota";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

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
