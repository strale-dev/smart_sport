"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

import { useCookieConsent } from "@/hooks/useCookieConsent";

export function useCaptureLandingView() {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }

    captured.current = true;

    void captureClientEvent(POSTHOG_EVENTS.landingView, {
      path: window.location.pathname,
      referrer: document.referrer || null,
    });
  }, [consent, isReady]);
}
