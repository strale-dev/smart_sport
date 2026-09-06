import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeAiGeneration,
  getAiRateLimitStatus,
  resetAiRateLimitForTests,
} from "@/lib/ratelimit/ai";

const mocks = vi.hoisted(() => ({
  getRemaining: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    getRemaining = mocks.getRemaining;
    limit = mocks.limit;

    constructor(_config: unknown) {}
  }

  return {
    Ratelimit: Object.assign(MockRatelimit, {
      fixedWindow: vi.fn(() => "fixed-window-limiter"),
    }),
  };
});

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(() => ({})),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getFreeTierAiPredictionsPerDay: () => 5,
  };
});

describe("ai rate limiter", () => {
  beforeEach(() => {
    resetAiRateLimitForTests();
    mocks.getRemaining.mockReset();
    mocks.limit.mockReset();
  });

  it("returns remaining quota without consuming", async () => {
    mocks.getRemaining.mockResolvedValue({
      limit: 5,
      remaining: 2,
      reset: Date.now() + 86_400_000,
    });

    const status = await getAiRateLimitStatus("user-1");
    expect(status).toEqual({
      limit: 5,
      used: 3,
      remaining: 2,
    });
    expect(mocks.getRemaining).toHaveBeenCalledWith("user-1:ai:day");
  });

  it("consumes one generation token", async () => {
    mocks.limit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 1,
      reset: Date.now() + 86_400_000,
    });

    const status = await consumeAiGeneration("user-1");
    expect(status).toEqual({
      limit: 5,
      used: 4,
      remaining: 1,
    });
    expect(mocks.limit).toHaveBeenCalledWith("user-1:ai:day");
  });
});
