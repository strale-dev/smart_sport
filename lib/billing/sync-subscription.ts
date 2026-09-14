import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapLemonStatusToDb,
  parsePriceAmountEur,
  resolveTierFromSubscription,
  type LemonSubscriptionAttributes,
} from "@/lib/billing/subscription-mapper";
import {
  extractUserIdFromWebhook,
  type LemonWebhookPayload,
} from "@/lib/billing/webhook-types";

export type SyncSubscriptionResult = {
  userId: string;
  subscriptionId: string;
  tier: "FREE" | "PREMIUM";
  skippedStale: boolean;
};

function parseWebhookTimestamp(payload: LemonWebhookPayload): string | null {
  return payload.data?.attributes?.updated_at ?? null;
}

export async function syncSubscriptionFromWebhook(
  payload: LemonWebhookPayload
): Promise<SyncSubscriptionResult | null> {
  const attributes = payload.data?.attributes;
  const providerSubscriptionId = payload.data?.id;

  if (!attributes || !providerSubscriptionId) {
    return null;
  }

  let userId = extractUserIdFromWebhook(payload);
  if (!userId && attributes.user_email) {
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("email", attributes.user_email)
      .maybeSingle();
    userId = profile?.id ?? null;
  }

  if (!userId) {
    throw new Error(
      "Webhook payload missing user_id (custom_data) and no matching profile email."
    );
  }

  const client = createAdminClient();

  const { data: existing } = await client
    .from("subscriptions")
    .select("id, updated_at")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();

  const incomingUpdatedAt = parseWebhookTimestamp(payload);
  if (
    existing?.updated_at &&
    incomingUpdatedAt &&
    new Date(incomingUpdatedAt).getTime() <
      new Date(existing.updated_at).getTime()
  ) {
    const { data: entitlement } = await client
      .from("entitlements")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      userId,
      subscriptionId: existing.id,
      tier: entitlement?.tier ?? "FREE",
      skippedStale: true,
    };
  }

  const status = mapLemonStatusToDb(attributes.status);
  const tier = resolveTierFromSubscription({
    status,
    endsAt: attributes.ends_at,
    trialEndsAt: attributes.trial_ends_at,
  });

  const subscriptionRow = {
    user_id: userId,
    provider: "lemonsqueezy",
    provider_subscription_id: providerSubscriptionId,
    provider_customer_id: String(attributes.customer_id),
    provider_variant_id: String(attributes.variant_id),
    status,
    price_amount: parsePriceAmountEur(attributes),
    price_currency: "EUR",
    trial_ends_at: attributes.trial_ends_at,
    renews_at: attributes.renews_at,
    cancelled_at: attributes.cancelled ? attributes.updated_at : null,
    ended_at: attributes.ends_at,
    raw_event_payload: payload as Json,
    updated_at: new Date().toISOString(),
  };

  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .upsert(subscriptionRow, { onConflict: "provider_subscription_id" })
    .select("id")
    .single();

  if (subscriptionError) {
    throw new Error(
      `Failed to upsert subscription: ${subscriptionError.message}`
    );
  }

  const premiumSince = tier === "PREMIUM" ? attributes.created_at : null;
  const premiumUntil =
    tier === "PREMIUM"
      ? (attributes.renews_at ?? attributes.trial_ends_at ?? attributes.ends_at)
      : null;

  const { error: entitlementError } = await client.from("entitlements").upsert(
    {
      user_id: userId,
      tier,
      subscription_id: subscription.id,
      premium_since: premiumSince,
      premium_until: premiumUntil,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (entitlementError) {
    throw new Error(`Failed to sync entitlements: ${entitlementError.message}`);
  }

  return {
    userId,
    subscriptionId: subscription.id,
    tier,
    skippedStale: false,
  };
}

export function subscriptionAttributesFromPayload(
  payload: LemonWebhookPayload
): LemonSubscriptionAttributes | null {
  return payload.data?.attributes ?? null;
}
