import {
  createCheckout,
  getStore,
  getVariant,
  lemonSqueezySetup,
  listProducts,
} from "@lemonsqueezy/lemonsqueezy.js";

import { resolvePremiumCheckoutVariantId } from "@/lib/billing/resolve-variant-id";
import { loadEnvFile } from "@/lib/env/load-local";

function readLemonEnv(): {
  apiKey: string;
  storeId: string;
  configuredVariantOrProductId: string;
} {
  loadEnvFile(".env.local", { override: true });

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const configuredVariantOrProductId =
    process.env.LEMONSQUEEZY_VARIANT_ID_PREMIUM_299?.trim();

  if (!apiKey || !storeId || !configuredVariantOrProductId) {
    console.error("Missing Lemon Squeezy env vars");
    process.exit(1);
  }

  return { apiKey, storeId, configuredVariantOrProductId };
}

async function main() {
  const { apiKey, storeId, configuredVariantOrProductId } = readLemonEnv();
  lemonSqueezySetup({ apiKey });

  const store = await getStore(storeId);
  console.log("getStore", store.statusCode, store.error?.message ?? "ok");

  const resolvedVariantId = await resolvePremiumCheckoutVariantId(
    configuredVariantOrProductId
  );
  console.log("resolvedVariantId", resolvedVariantId);

  const variant = await getVariant(resolvedVariantId);
  console.log("getVariant", variant.statusCode, variant.error?.message ?? "ok");

  const products = await listProducts({ filter: { storeId } });
  console.log(
    "products",
    products.data?.data?.map((entry) => ({
      id: entry.id,
      name: entry.attributes.name,
    }))
  );

  const checkout = await createCheckout(storeId, resolvedVariantId, {
    checkoutData: { custom: { user_id: "debug-user" } },
  });
  console.log(
    "createCheckout",
    checkout.statusCode,
    checkout.error?.message ?? checkout.data?.data.attributes.url
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
