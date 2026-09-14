import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyLemonSqueezyWebhookSignature } from "@/lib/billing/webhook-verify";

describe("verifyLemonSqueezyWebhookSignature", () => {
  it("accepts valid HMAC signatures", () => {
    const secret = "test-secret";
    const rawBody = '{"meta":{"event_name":"subscription_created"}}';
    const signature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyLemonSqueezyWebhookSignature({
        rawBody,
        signatureHeader: signature,
        secret,
      })
    ).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(
      verifyLemonSqueezyWebhookSignature({
        rawBody: "{}",
        signatureHeader: "deadbeef",
        secret: "test-secret",
      })
    ).toBe(false);
  });
});
