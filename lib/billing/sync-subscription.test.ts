import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LemonWebhookPayload } from "@/lib/billing/webhook-types";

const mocks = vi.hoisted(() => ({
  existingSubscription: null as { id: string; updated_at: string } | null,
  entitlementTier: "FREE" as "FREE" | "PREMIUM",
  lastEntitlementUpsert: null as Record<string, unknown> | null,
  lastSubscriptionUpsert: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }

      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: mocks.existingSubscription,
              }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                mocks.lastSubscriptionUpsert = row;
                return { data: { id: "sub-db-1" }, error: null };
              },
            }),
          }),
        };
      }

      if (table === "entitlements") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { tier: mocks.entitlementTier },
              }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => {
            mocks.lastEntitlementUpsert = row;
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { syncSubscriptionFromWebhook } from "@/lib/billing/sync-subscription";

function basePayload(
  overrides: {
    status?: string;
    updatedAt?: string;
    endsAt?: string | null;
    trialEndsAt?: string | null;
    cancelled?: boolean;
  } = {}
): LemonWebhookPayload {
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
  return {
    meta: {
      custom_data: { user_id: "user-1" },
    },
    data: {
      id: "ls-sub-1",
      attributes: {
        store_id: 1,
        customer_id: 99,
        variant_id: 42,
        status: overrides.status ?? "on_trial",
        renews_at: future,
        ends_at: overrides.endsAt ?? null,
        trial_ends_at: overrides.trialEndsAt ?? future,
        cancelled: overrides.cancelled ?? false,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: overrides.updatedAt ?? "2026-09-18T12:00:00.000Z",
      },
    },
  };
}

describe("syncSubscriptionFromWebhook", () => {
  beforeEach(() => {
    mocks.existingSubscription = null;
    mocks.entitlementTier = "FREE";
    mocks.lastEntitlementUpsert = null;
    mocks.lastSubscriptionUpsert = null;
  });

  it("upserts PREMIUM tier for on_trial subscription_created payload", async () => {
    const result = await syncSubscriptionFromWebhook(basePayload());

    expect(result).toMatchObject({
      userId: "user-1",
      tier: "PREMIUM",
      skippedStale: false,
    });
    expect(mocks.lastEntitlementUpsert).toMatchObject({ tier: "PREMIUM" });
  });

  it("skips stale webhook when incoming updated_at is older than stored row", async () => {
    mocks.existingSubscription = {
      id: "sub-db-existing",
      updated_at: "2026-09-18T14:00:00.000Z",
    };
    mocks.entitlementTier = "PREMIUM";

    const result = await syncSubscriptionFromWebhook(
      basePayload({ updatedAt: "2026-09-18T10:00:00.000Z" })
    );

    expect(result).toMatchObject({
      userId: "user-1",
      subscriptionId: "sub-db-existing",
      tier: "PREMIUM",
      skippedStale: true,
    });
    expect(mocks.lastSubscriptionUpsert).toBeNull();
    expect(mocks.lastEntitlementUpsert).toBeNull();
  });

  it("downgrades to FREE when subscription expired", async () => {
    const result = await syncSubscriptionFromWebhook(
      basePayload({
        status: "expired",
        endsAt: "2026-09-01T00:00:00.000Z",
        trialEndsAt: null,
      })
    );

    expect(result?.tier).toBe("FREE");
    expect(mocks.lastEntitlementUpsert).toMatchObject({ tier: "FREE" });
  });

  it("keeps PREMIUM during cancelled grace period", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const result = await syncSubscriptionFromWebhook(
      basePayload({
        status: "cancelled",
        cancelled: true,
        endsAt: future,
      })
    );

    expect(result?.tier).toBe("PREMIUM");
    expect(mocks.lastEntitlementUpsert).toMatchObject({ tier: "PREMIUM" });
  });
});
