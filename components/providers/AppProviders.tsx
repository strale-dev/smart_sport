"use client";

import { CookieConsentProvider } from "@/components/marketing/CookieConsentProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CookieConsentProvider>{children}</CookieConsentProvider>;
}
