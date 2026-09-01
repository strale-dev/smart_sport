"use client";

import { AuthAnalytics } from "@/components/auth/AuthAnalytics";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import { CookieConsentProvider } from "@/components/marketing/CookieConsentProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <AuthAnalytics />
      <RecoveryRedirect />
      {children}
    </CookieConsentProvider>
  );
}
