"use client";

import { AuthAnalytics } from "@/components/auth/AuthAnalytics";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import { CookieConsentProvider } from "@/components/marketing/CookieConsentProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CookieConsentProvider>
        <AuthAnalytics />
        <RecoveryRedirect />
        {children}
      </CookieConsentProvider>
    </QueryProvider>
  );
}
