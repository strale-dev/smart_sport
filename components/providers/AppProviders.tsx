"use client";

import { AuthAnalytics } from "@/components/auth/AuthAnalytics";
import { CookieConsentProvider } from "@/components/marketing/CookieConsentProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <AuthAnalytics />
      {children}
    </CookieConsentProvider>
  );
}
