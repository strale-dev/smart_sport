import { getCustomer } from "@lemonsqueezy/lemonsqueezy.js";

import { ensureLemonSqueezyConfigured } from "@/lib/billing/lemonsqueezy-client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCustomerPortalUrlForUser(
  userId: string
): Promise<string | null> {
  ensureLemonSqueezyConfigured();

  const client = createAdminClient();
  const { data, error } = await client
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .in("status", ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read subscription: ${error.message}`);
  }

  if (!data?.provider_customer_id) {
    return null;
  }

  const response = await getCustomer(data.provider_customer_id);
  if (response.error) {
    throw response.error;
  }

  const portalUrl = response.data?.data.attributes.urls?.customer_portal;
  return portalUrl ?? null;
}
