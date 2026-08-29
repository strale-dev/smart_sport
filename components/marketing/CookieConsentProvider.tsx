"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { consentFromChoice, createConsentState } from "@/lib/cookies/consent";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  persistConsentSnapshot,
  subscribeToConsent,
} from "@/lib/cookies/consent-store";
import type { CookieConsentState } from "@/lib/cookies/types";
import {
  captureClientEvent,
  setPostHogAnalyticsConsent,
} from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

type CookieConsentContextValue = {
  consent: CookieConsentState | null;
  isReady: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (analytics: boolean) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null
);

async function applyAnalyticsConsent(
  consent: CookieConsentState,
  trackUpdate = false
): Promise<void> {
  await setPostHogAnalyticsConsent(consent.analytics);

  if (trackUpdate) {
    await captureClientEvent(POSTHOG_EVENTS.cookieConsentUpdated, {
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
  }
}

const subscribeNoop = () => () => {};

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );
  const isReady = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isReady || !consent) {
      return;
    }

    void applyAnalyticsConsent(consent);
  }, [consent, isReady]);

  const persistConsent = useCallback((next: CookieConsentState) => {
    persistConsentSnapshot(next);
    void applyAnalyticsConsent(next, true);
  }, []);

  const acceptAll = useCallback(() => {
    persistConsent(consentFromChoice("accept_all"));
  }, [persistConsent]);

  const rejectNonEssential = useCallback(() => {
    persistConsent(consentFromChoice("reject_non_essential"));
  }, [persistConsent]);

  const savePreferences = useCallback(
    (analytics: boolean) => {
      persistConsent(
        createConsentState({
          necessary: true,
          analytics,
          marketing: false,
        })
      );
    },
    [persistConsent]
  );

  const value = useMemo(
    () => ({
      consent,
      isReady,
      acceptAll,
      rejectNonEssential,
      savePreferences,
    }),
    [acceptAll, consent, isReady, rejectNonEssential, savePreferences]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsentContext(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error(
      "useCookieConsentContext must be used within CookieConsentProvider"
    );
  }
  return context;
}
