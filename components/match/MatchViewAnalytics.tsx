"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { Fixture } from "@/types/domain";

import { useCookieConsent } from "@/hooks/useCookieConsent";

type MatchViewAnalyticsProps = {
  fixture: Fixture;
  isGuest: boolean;
};

export function MatchViewAnalytics({
  fixture,
  isGuest,
}: MatchViewAnalyticsProps) {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }

    captured.current = true;

    void captureClientEvent(POSTHOG_EVENTS.matchViewed, {
      fixture_id: fixture.externalId,
      league_id: fixture.league.externalId,
      status: fixture.status,
      is_guest: isGuest,
    });
  }, [consent, fixture, isGuest, isReady]);

  return null;
}
