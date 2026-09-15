import { beforeEach, describe, expect, it, vi } from "vitest";

import { assertCanGenerateAi, recordAiGeneration } from "@/lib/ai/usage-gate";

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
  getUserEntitlement: vi.fn(),
  isPremiumEntitlement: vi.fn(),
  recordAIUsage: vi.fn(),
}));

import {
  assertCanGenerateAI,
  getUserEntitlement,
  isPremiumEntitlement,
  recordAIUsage,
} from "@/lib/entitlements/entitlementService";

describe("usage gate", () => {
  beforeEach(() => {
    vi.mocked(assertCanGenerateAI).mockReset();
    vi.mocked(recordAIUsage).mockReset();
    vi.mocked(getUserEntitlement).mockReset();
    vi.mocked(isPremiumEntitlement).mockReset();
    vi.mocked(assertCanGenerateAI).mockResolvedValue(undefined);
    vi.mocked(getUserEntitlement).mockResolvedValue({
      userId: "user-1",
      tier: "FREE",
      subscriptionStatus: null,
      premiumUntil: null,
    });
    vi.mocked(isPremiumEntitlement).mockReturnValue(false);
  });

  it("delegates allowance checks to entitlementService", async () => {
    await expect(assertCanGenerateAi("user-1")).resolves.toBeUndefined();
    expect(assertCanGenerateAI).toHaveBeenCalledWith(
      "user-1",
      "prediction",
      undefined
    );
  });

  it("records usage through entitlementService", async () => {
    vi.mocked(recordAIUsage).mockResolvedValue({
      ai_predictions_count: 3,
      ai_deep_analyses_count: 0,
      ai_generations_count: 3,
      live_ai_matches: [],
      last_live_ai_at: {},
    });

    await expect(recordAiGeneration("user-1")).resolves.toBe(3);
    expect(recordAIUsage).toHaveBeenCalledWith(
      "user-1",
      "prediction",
      undefined
    );
  });

  it("returns generation count for premium users", async () => {
    vi.mocked(isPremiumEntitlement).mockReturnValue(true);
    vi.mocked(recordAIUsage).mockResolvedValue({
      ai_predictions_count: 99,
      ai_deep_analyses_count: 0,
      ai_generations_count: 120,
      live_ai_matches: [],
      last_live_ai_at: {},
    });

    await expect(recordAiGeneration("user-1")).resolves.toBe(120);
  });
});
