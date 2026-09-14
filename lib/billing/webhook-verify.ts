import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyLemonSqueezyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!input.signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");

  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(input.signatureHeader, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
