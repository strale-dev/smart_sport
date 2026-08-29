import { describe, expect, it } from "vitest";

import { isSentryEnabled } from "@/lib/sentry/options";

describe("isSentryEnabled", () => {
  it("rejects placeholder DSN values", () => {
    expect(isSentryEnabled(undefined)).toBe(false);
    expect(
      isSentryEnabled("https://examplePublicKey@o0.ingest.sentry.io/0")
    ).toBe(false);
    expect(isSentryEnabled("https://abc@o0.ingest.sentry.io/1")).toBe(false);
  });

  it("accepts real-looking DSN values", () => {
    expect(
      isSentryEnabled(
        "https://abc123def456@o123456.ingest.de.sentry.io/7890123"
      )
    ).toBe(true);
  });
});
