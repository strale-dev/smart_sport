"use server";

import { redirect } from "next/navigation";

import { createPremiumCheckoutUrl } from "@/lib/billing/checkout";
import { getCustomerPortalUrlForUser } from "@/lib/billing/customer-portal";
import { hasLemonSqueezyConfig } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/user";

export async function createCheckoutSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.email) {
    throw new Error("SIGN_IN_REQUIRED");
  }

  if (!hasLemonSqueezyConfig()) {
    throw new Error("BILLING_NOT_CONFIGURED");
  }

  const client = createAdminClient();
  const { data: profile } = await client
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const checkoutUrl = await createPremiumCheckoutUrl({
    userId: user.id,
    email: profile?.email ?? user.email,
    name: profile?.display_name,
  });

  redirect(checkoutUrl);
}

export async function openCustomerPortal(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("SIGN_IN_REQUIRED");
  }

  if (!hasLemonSqueezyConfig()) {
    throw new Error("BILLING_NOT_CONFIGURED");
  }

  const portalUrl = await getCustomerPortalUrlForUser(user.id);
  if (!portalUrl) {
    throw new Error("NO_ACTIVE_SUBSCRIPTION");
  }

  redirect(portalUrl);
}
