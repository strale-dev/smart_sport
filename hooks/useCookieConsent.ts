"use client";

import { useCookieConsentContext } from "@/components/marketing/CookieConsentProvider";

export function useCookieConsent() {
  return useCookieConsentContext();
}
