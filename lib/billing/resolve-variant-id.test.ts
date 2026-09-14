import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  getVariant: vi.fn(),
  getProduct: vi.fn(),
}));

vi.mock("@/lib/billing/lemonsqueezy-client", () => ({
  ensureLemonSqueezyConfigured: vi.fn(),
}));

import { getProduct, getVariant } from "@lemonsqueezy/lemonsqueezy.js";

import {
  resetPremiumVariantIdCache,
  resolvePremiumCheckoutVariantId,
} from "@/lib/billing/resolve-variant-id";

describe("resolvePremiumCheckoutVariantId", () => {
  beforeEach(() => {
    resetPremiumVariantIdCache();
  });
  it("returns the configured ID when it is a valid variant", async () => {
    vi.mocked(getVariant).mockResolvedValue({
      statusCode: 200,
      data: { data: { id: "2125876" } },
      error: null,
    } as never);

    await expect(resolvePremiumCheckoutVariantId("2125876")).resolves.toBe(
      "2125876"
    );
  });

  it("resolves a product ID to a variant from included data", async () => {
    vi.mocked(getVariant).mockResolvedValue({
      statusCode: 404,
      data: null,
      error: new Error("Not Found"),
    } as never);
    vi.mocked(getProduct).mockResolvedValue({
      statusCode: 200,
      data: {
        included: [
          { type: "variants", id: "2125893", attributes: { name: "Default" } },
          {
            type: "variants",
            id: "2125876",
            attributes: { name: "Scorence Premium" },
          },
        ],
      },
      error: null,
    } as never);

    await expect(resolvePremiumCheckoutVariantId("1361279")).resolves.toBe(
      "2125876"
    );
  });
});
