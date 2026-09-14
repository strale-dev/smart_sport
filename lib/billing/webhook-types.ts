import type { LemonSubscriptionAttributes } from "@/lib/billing/subscription-mapper";

export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: LemonSubscriptionAttributes;
  };
};

export function extractUserIdFromWebhook(
  payload: LemonWebhookPayload
): string | null {
  const custom = payload.meta?.custom_data;
  if (custom && typeof custom.user_id === "string" && custom.user_id.length) {
    return custom.user_id;
  }

  const nested = custom?.custom;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    typeof (nested as Record<string, unknown>).user_id === "string"
  ) {
    return (nested as Record<string, string>).user_id;
  }

  return null;
}
