import "server-only";

import {
  getUserEntitlement,
  isPremiumEntitlement,
} from "@/lib/entitlements/entitlementService";

/** Guests see full non-AI analytics per PRD; limits apply to signed-in free users. */
export async function canAccessPremiumAnalytics(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) {
    return true;
  }

  const entitlement = await getUserEntitlement(userId);
  return isPremiumEntitlement(entitlement.tier, entitlement.subscriptionStatus);
}
