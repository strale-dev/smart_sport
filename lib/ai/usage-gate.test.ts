import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiLimitReachedError,
  AiRateLimitUnavailableError,
  assertCanGenerateAi,
  getAiUsageStatus,
  recordAiGeneration,
} from "@/lib/ai/usage-gate";

vi.mock("@/lib/entitlements/entitlementService", () => ({
  AiLimitReachedError: class AiLimitReachedError extends Error {
    readonly code = "AI_LIMIT_REACHED" as const;
    readonly limit: number;
    readonly used: number;
    readonly kind: string;

    constructor(kind: string, limit: number, used: number) {
      super("Daily AI limit reached");
      this.name = "AiLimitReachedError";
      this.kind = kind;
      this.limit = limit;
      this.used = used;
    }
  },
  assertCanGenerateAI: vi.fn(),
  getAiUsageSummary: vi.fn(),
  recordAIUsage: vi.fn(),
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

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_ENV: "development" as "development" | "production",
}));

vi.mock("@/lib/env.server", () => ({
  env: mockEnv,
}));

import {
  assertCanGenerateAI,
  getAiUsageSummary,
  recordAIUsage,
} from "@/lib/entitlements/entitlementService";
import {
  consumeAiGeneration,
  getAiRateLimitStatus,
  isAiRateLimitAvailable,
} from "@/lib/ratelimit/ai";

describe("usage gate", () => {
  beforeEach(() => {
    mockEnv.NEXT_PUBLIC_APP_ENV = "development";
    vi.mocked(assertCanGenerateAI).mockReset();
    vi.mocked(getAiUsageSummary).mockReset();
    vi.mocked(recordAIUsage).mockReset();
    vi.mocked(getAiRateLimitStatus).mockReset();
    vi.mocked(consumeAiGeneration).mockReset();
    vi.mocked(isAiRateLimitAvailable).mockReset();
    vi.mocked(assertCanGenerateAI).mockResolvedValue(undefined);
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

  it("blocks when redis remaining is zero", async () => {
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

  it("uses entitlement summary when redis is unavailable", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(false);
    vi.mocked(getAiUsageSummary).mockResolvedValue({
      limit: 5,
      used: 2,
      remaining: 3,
    });

    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
    await expect(getAiUsageStatus("user-1")).resolves.toEqual({
      limit: 5,
      used: 2,
      remaining: 3,
    });
  });

  it("allows postgres entitlements in production when redis is unavailable", async () => {
    mockEnv.NEXT_PUBLIC_APP_ENV = "production";
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(false);

    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
  });

  it("records usage and consumes redis token after success", async () => {
    vi.mocked(isAiRateLimitAvailable).mockReturnValue(true);
    vi.mocked(recordAIUsage).mockResolvedValue({
      ai_predictions_count: 3,
      ai_deep_analyses_count: 0,
      ai_generations_count: 3,
      live_ai_matches: [],
      last_live_ai_at: {},
    });
    vi.mocked(consumeAiGeneration).mockResolvedValue({
      limit: 5,
      used: 3,
      remaining: 2,
    });

    await expect(recordAiGeneration("user-1")).resolves.toBe(3);
    expect(recordAIUsage).toHaveBeenCalledWith(
      "user-1",
      "prediction",
      undefined
    );
    expect(consumeAiGeneration).toHaveBeenCalledWith("user-1");
  });
});
