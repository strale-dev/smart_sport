"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

import { useCookieConsent } from "@/hooks/useCookieConsent";

type PredictionsViewAnalyticsProps = {
  isGuest: boolean;
  pickCount: number;
};

export function PredictionsViewAnalytics({
  isGuest,
  pickCount,
}: PredictionsViewAnalyticsProps) {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }
    captured.current = true;
    void captureClientEvent(POSTHOG_EVENTS.predictionsCenterViewed, {
      is_guest: isGuest,
      pick_count: pickCount,
    });
  }, [consent, isGuest, isReady, pickCount]);

  return null;
}
