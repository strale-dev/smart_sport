import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

import { serverEnv } from "@/lib/env.server";
import { hasLemonSqueezyConfig } from "@/lib/env";

let configured = false;

export function ensureLemonSqueezyConfigured(): void {
  if (configured) {
    return;
  }

  if (!hasLemonSqueezyConfig()) {
    throw new Error("LemonSqueezy is not configured.");
  }

  lemonSqueezySetup({
    apiKey: serverEnv.LEMONSQUEEZY_API_KEY,
  });
  configured = true;
}

export function getLemonSqueezyStoreId(): string {
  ensureLemonSqueezyConfigured();
  const storeId = serverEnv.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID is missing.");
  }
  return storeId;
}

export function getPremiumVariantId(): string {
  ensureLemonSqueezyConfigured();
  const variantId = serverEnv.LEMONSQUEEZY_VARIANT_ID_PREMIUM_299;
  if (!variantId) {
    throw new Error("LEMONSQUEEZY_VARIANT_ID_PREMIUM_299 is missing.");
  }
  return variantId;
}
