import { describe, expect, it } from "vitest";

import {
  consentFromChoice,
  createConsentState,
  hasAnalyticsConsent,
  parseStoredConsent,
} from "@/lib/cookies/consent";

describe("cookie consent", () => {
  it("accept_all enables analytics", () => {
    const consent = consentFromChoice("accept_all");
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(false);
    expect(consent.necessary).toBe(true);
    expect(hasAnalyticsConsent(consent)).toBe(true);
  });

  it("reject_non_essential disables analytics", () => {
    const consent = consentFromChoice("reject_non_essential");
    expect(consent.analytics).toBe(false);
    expect(hasAnalyticsConsent(consent)).toBe(false);
  });

  it("parses valid stored consent", () => {
    const stored = createConsentState({
      necessary: true,
      analytics: true,
      marketing: false,
    });

    expect(parseStoredConsent(stored)).toEqual(stored);
  });

  it("rejects invalid stored consent", () => {
    expect(parseStoredConsent({ analytics: true })).toBeNull();
  });
});
