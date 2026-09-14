import { getProduct, getVariant } from "@lemonsqueezy/lemonsqueezy.js";

import { ensureLemonSqueezyConfigured } from "@/lib/billing/lemonsqueezy-client";

let cachedVariantId: string | null = null;

/** @internal Vitest only */
export function resetPremiumVariantIdCache(): void {
  cachedVariantId = null;
}

function pickVariantFromProduct(
  included: Array<{ type: string; id: string; attributes?: { name?: string } }>
): string | null {
  const variants = included.filter((entry) => entry.type === "variants");
  if (variants.length === 0) {
    return null;
  }

  const named = variants.find(
    (entry) =>
      entry.attributes?.name &&
      entry.attributes.name.toLowerCase() !== "default"
  );
  return (named ?? variants[0])!.id;
}

/**
 * Resolves checkout variant ID. Accepts a variant ID or (legacy misconfig) a product ID.
 */
export async function resolvePremiumCheckoutVariantId(
  configuredId: string
): Promise<string> {
  if (cachedVariantId) {
    return cachedVariantId;
  }

  ensureLemonSqueezyConfigured();
  const trimmed = configuredId.trim();

  const variantResponse = await getVariant(trimmed);
  if (variantResponse.statusCode === 200 && variantResponse.data?.data?.id) {
    cachedVariantId = variantResponse.data.data.id;
    return cachedVariantId;
  }

  const productResponse = await getProduct(trimmed, { include: ["variants"] });
  if (productResponse.statusCode === 200) {
    const resolved = pickVariantFromProduct(
      productResponse.data?.included ?? []
    );
    if (resolved) {
      cachedVariantId = resolved;
      return resolved;
    }
  }

  throw new Error(
    `LemonSqueezy variant not found for LEMONSQUEEZY_VARIANT_ID_PREMIUM_299="${trimmed}". ` +
      "Use the variant ID from Lemon Squeezy (Products → variant), not the product ID."
  );
}
