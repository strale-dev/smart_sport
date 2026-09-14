import type { Database } from "@/types/supabase";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
type AppTier = Database["public"]["Enums"]["app_tier"];

export type LemonSubscriptionAttributes = {
  store_id: number;
  customer_id: number;
  variant_id: number;
  user_email?: string;
  status: string;
  renews_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  cancelled: boolean;
  created_at: string;
  updated_at: string;
  first_subscription_item?: {
    price?: number;
    price_id?: number;
  };
};

export function mapLemonStatusToDb(lemonStatus: string): SubscriptionStatus {
  switch (lemonStatus) {
    case "on_trial":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "paused":
      return "CANCELLED";
    default:
      return "EXPIRED";
  }
}

export function resolveTierFromSubscription(input: {
  status: SubscriptionStatus;
  endsAt: string | null;
  trialEndsAt: string | null;
}): AppTier {
  const now = Date.now();

  if (input.status === "TRIALING" || input.status === "ACTIVE") {
    return "PREMIUM";
  }

  if (input.status === "PAST_DUE") {
    return "PREMIUM";
  }

  if (input.status === "CANCELLED") {
    const graceEnd = input.endsAt ?? input.trialEndsAt;
    if (graceEnd && new Date(graceEnd).getTime() > now) {
      return "PREMIUM";
    }
    return "FREE";
  }

  return "FREE";
}

export function parsePriceAmountEur(
  attributes: LemonSubscriptionAttributes
): number {
  const cents = attributes.first_subscription_item?.price;
  if (typeof cents === "number" && cents > 0) {
    return cents / 100;
  }
  return 2.99;
}
