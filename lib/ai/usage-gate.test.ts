import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiLimitReachedError,
  AiRateLimitUnavailableError,
  assertCanGenerateAi,
  getAiUsageStatus,
  recordAiGeneration,
} from "@/lib/ai/usage-gate";

vi.mock("@/lib/ai/db", () => ({
  readAiUsage: vi.fn(),
  incrementAiUsage: vi.fn(),
}));

vi.mock("@/lib/ratelimit/ai", () => ({
  AiRateLimitUnavailableError: class AiRateLimitUnavailableError extends Error {
    readonly code = "RATE_LIMIT_UNAVAILABLE" as const;

    constructor() {
      super("AI rate limiting is unavailable");
      this.name = "AiRateLimitUnavailableError";
    }
  },
  consumeAiGeneration: vi.fn(),
  getAiRateLimitStatus: vi.fn(),
  isAiRateLimitAvailable: vi.fn(),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    getFreeTierAiPredictionsPerDay: () => 5,
  };
});

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_ENV: "development" as "development" | "production",
}));

vi.mock("@/lib/env.server", () => ({
  env: mockEnv,
}));

import { readAiUsage, incrementAiUsage } from "@/lib/ai/db";
import {
  consumeAiGeneration,
  getAiRateLimitStatus,
  isAiRateLimitAvailable,
} from "@/lib/ratelimit/ai";

describe("usage gate", () => {
  beforeEach(() => {
    mockEnv.NEXT_PUBLIC_APP_ENV = "development";
    vi.mocked(readAiUsage).mockReset();
    vi.mocked(incrementAiUsage).mockReset();
    vi.mocked(getAiRateLimitStatus).mockReset();
    vi.mocked(consumeAiGeneration).mockReset();
    vi.mocked(isAiRateLimitAvailable).mockReset();
  });

  it("allows generation below the daily cap via redis", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(true);
    vi.mocked(getAiRateLimitStatus).mockResolvedValue({
      limit: 5,
      used: 4,
      remaining: 1,
    });

    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
  });

  it("blocks the sixth generation when redis remaining is zero", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(true);
    vi.mocked(getAiRateLimitStatus).mockResolvedValue({
      limit: 5,
      used: 5,
      remaining: 0,
    });

    await expect(assertCanGenerateAi("user-1")).rejects.toBeInstanceOf(
      AiLimitReachedError
    );
  });

  it("falls back to postgres in development when redis is unavailable", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(false);
    vi.mocked(readAiUsage).mockResolvedValue(2);

    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
  });

  it("throws when redis is unavailable in production", async () => {
    mockEnv.NEXT_PUBLIC_APP_ENV = "production";
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(false);

    await expect(assertCanGenerateAi("user-1")).rejects.toBeInstanceOf(
      AiRateLimitUnavailableError
    );
  });

  it("returns redis-backed usage status when available", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(true);
    vi.mocked(getAiRateLimitStatus).mockResolvedValue({
      limit: 5,
      used: 2,
      remaining: 3,
    });

    await expect(getAiUsageStatus("user-1")).resolves.toEqual({
      limit: 5,
      used: 2,
      remaining: 3,
    });
  });

  it("records postgres usage and consumes redis token after success", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(true);
    vi.mocked(incrementAiUsage).mockResolvedValue(3);
    vi.mocked(consumeAiGeneration).mockResolvedValue({
      limit: 5,
      used: 3,
      remaining: 2,
    });

    await expect(recordAiGeneration("user-1")).resolves.toBe(3);
    expect(incrementAiUsage).toHaveBeenCalledWith("user-1");
    expect(consumeAiGeneration).toHaveBeenCalledWith("user-1");
  });
});
