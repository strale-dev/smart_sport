import { z } from "zod";

import type {
  CookieConsentCategories,
  CookieConsentChoice,
  CookieConsentState,
} from "@/lib/cookies/types";

export const CONSENT_STORAGE_KEY = "kivora_cookie_consent_v1";

export const cookieConsentSchema = z.object({
  version: z.literal(1),
  necessary: z.literal(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
  updatedAt: z.string().datetime(),
});

export function createConsentState(
  categories: CookieConsentCategories
): CookieConsentState {
  return {
    version: 1,
    ...categories,
    updatedAt: new Date().toISOString(),
  };
}

export function consentFromChoice(
  choice: CookieConsentChoice
): CookieConsentState {
  switch (choice) {
    case "accept_all":
      return createConsentState({
        necessary: true,
        analytics: true,
        marketing: false,
      });
    case "reject_non_essential":
      return createConsentState({
        necessary: true,
        analytics: false,
        marketing: false,
      });
    case "custom":
      throw new Error("Custom consent must be built explicitly");
  }
}

export function parseStoredConsent(raw: unknown): CookieConsentState | null {
  const result = cookieConsentSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function readConsentFromStorage(
  storage: Pick<Storage, "getItem">
): CookieConsentState | null {
  const raw = storage.getItem(CONSENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseStoredConsent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeConsentToStorage(
  storage: Pick<Storage, "setItem">,
  consent: CookieConsentState
): void {
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

export function hasAnalyticsConsent(
  consent: CookieConsentState | null
): boolean {
  return consent?.analytics === true;
}
