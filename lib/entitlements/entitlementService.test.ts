import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  entitlement: {
    tier: "FREE" as "FREE" | "PREMIUM",
    subscriptionStatus: null as "TRIALING" | "ACTIVE" | null,
    premiumUntil: null as string | null,
  },
  usage: {
    ai_predictions_count: 0,
    ai_deep_analyses_count: 0,
    ai_generations_count: 0,
    live_ai_matches: [] as string[],
    last_live_ai_at: {} as Record<string, string>,
  },
  addBreadcrumb: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: mocks.addBreadcrumb,
}));

vi.mock("@/lib/entitlements/usage", () => ({
  readAiUsageRow: vi.fn(async () => mocks.usage),
  incrementAiUsageCounters: vi.fn(),
}));

vi.mock("@/lib/entitlements/limits", () => ({
  getFreeTierLimits: () => ({
    predictionsPerDay: 3,
    deepAnalysesPerDay: 1,
    generationsPerDay: 3,
    liveAiMatchesPerDay: 2,
    liveAiMinIntervalSec: 120,
    liveMatchesSimultaneous: 1,
    premiumSoftCapPerDay: null,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "entitlements") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  tier: mocks.entitlement.tier,
                  premium_until: mocks.entitlement.premiumUntil,
                  subscription_id: "sub-1",
                },
              }),
            }),
          }),
        };
      }

      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: mocks.entitlement.subscriptionStatus
                  ? { status: mocks.entitlement.subscriptionStatus }
                  : null,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import {
  AiLimitReachedError,
  assertCanGenerateAI,
  canGenerateAI,
} from "@/lib/entitlements/entitlementService";

describe("entitlementService.canGenerateAI", () => {
  beforeEach(() => {
    mocks.addBreadcrumb.mockReset();
    mocks.entitlement = {
      tier: "FREE",
      subscriptionStatus: null,
      premiumUntil: null,
    };
    mocks.usage = {
      ai_predictions_count: 0,
      ai_deep_analyses_count: 0,
      ai_generations_count: 0,
      live_ai_matches: [],
      last_live_ai_at: {},
    };
  });

  it("throws AiLimitReachedError when free tier hits daily generation cap", async () => {
    mocks.usage.ai_generations_count = 3;
    mocks.usage.ai_predictions_count = 3;

    await expect(canGenerateAI("user-1", "prediction")).rejects.toBeInstanceOf(
      AiLimitReachedError
    );
  });

  it("allows PREMIUM TRIALING users without free-tier cap", async () => {
    mocks.entitlement.tier = "PREMIUM";
    mocks.entitlement.subscriptionStatus = "TRIALING";
    mocks.usage.ai_generations_count = 100;
    mocks.usage.ai_predictions_count = 100;

    await expect(
      canGenerateAI("user-1", "prediction")
    ).resolves.toBeUndefined();
  });

  it("records Sentry breadcrumb when assertCanGenerateAI denies generation", async () => {
    mocks.usage.ai_generations_count = 3;
    mocks.usage.ai_predictions_count = 3;

    await expect(
      assertCanGenerateAI("user-1", "generation")
    ).rejects.toBeInstanceOf(AiLimitReachedError);

    expect(mocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "entitlements",
        message: "AI generation denied",
      })
    );
  });
});
