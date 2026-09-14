import { createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

import {
  ensureLemonSqueezyConfigured,
  getLemonSqueezyStoreId,
  getPremiumVariantId,
} from "@/lib/billing/lemonsqueezy-client";
import { resolvePremiumCheckoutVariantId } from "@/lib/billing/resolve-variant-id";
import { env } from "@/lib/env.server";

export type CreateCheckoutInput = {
  userId: string;
  email: string;
  name?: string | null;
};

export async function createPremiumCheckoutUrl(
  input: CreateCheckoutInput
): Promise<string> {
  ensureLemonSqueezyConfigured();

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const redirectUrl = `${siteUrl}/profile/subscription?checkout=success`;

  const variantId = await resolvePremiumCheckoutVariantId(
    getPremiumVariantId()
  );

  const response = await createCheckout(getLemonSqueezyStoreId(), variantId, {
    productOptions: {
      redirectUrl,
      receiptLinkUrl: redirectUrl,
    },
    checkoutData: {
      email: input.email,
      name: input.name ?? undefined,
      custom: {
        user_id: input.userId,
      },
    },
  });

  if (response.error) {
    throw response.error;
  }

  const url = response.data?.data.attributes.url;
  if (!url) {
    throw new Error("LemonSqueezy checkout did not return a URL.");
  }

  return url;
}
