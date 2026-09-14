import { createAdminClient } from "@/lib/supabase/admin";
import { isPremiumEntitlement } from "@/lib/entitlements/entitlementService";
import type { Database } from "@/types/supabase";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export type SubscriptionSummary = {
  tier: Database["public"]["Enums"]["app_tier"];
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  trialEndsAt: string | null;
  renewsAt: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
};

export async function readSubscriptionSummaryForUser(
  userId: string
): Promise<SubscriptionSummary> {
  const client = createAdminClient();

  const { data: entitlement, error: entitlementError } = await client
    .from("entitlements")
    .select("tier, subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (entitlementError) {
    throw new Error(`Failed to read entitlements: ${entitlementError.message}`);
  }

  let subscriptionStatus: SubscriptionStatus | null = null;
  let trialEndsAt: string | null = null;
  let renewsAt: string | null = null;
  let priceAmount: number | null = null;
  let priceCurrency: string | null = null;

  if (entitlement?.subscription_id) {
    const { data: subscription, error: subscriptionError } = await client
      .from("subscriptions")
      .select("status, trial_ends_at, renews_at, price_amount, price_currency")
      .eq("id", entitlement.subscription_id)
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(
        `Failed to read subscription: ${subscriptionError.message}`
      );
    }

    subscriptionStatus = subscription?.status ?? null;
    trialEndsAt = subscription?.trial_ends_at ?? null;
    renewsAt = subscription?.renews_at ?? null;
    priceAmount = subscription?.price_amount ?? null;
    priceCurrency = subscription?.price_currency ?? null;
  }

  const tier = entitlement?.tier ?? "FREE";

  return {
    tier,
    isPremium: isPremiumEntitlement(tier, subscriptionStatus),
    subscriptionStatus,
    trialEndsAt,
    renewsAt,
    priceAmount,
    priceCurrency,
  };
}
