"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { LeagueTab } from "@/lib/leagues/url";

import { useCookieConsent } from "@/hooks/useCookieConsent";

type LeagueViewAnalyticsProps = {
  leagueExternalId: number;
  seasonYear: number | null;
  tab: LeagueTab;
  isGuest: boolean;
};

export function LeagueViewAnalytics({
  leagueExternalId,
  seasonYear,
  tab,
  isGuest,
}: LeagueViewAnalyticsProps) {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }

    captured.current = true;

    void captureClientEvent(POSTHOG_EVENTS.leagueViewed, {
      league_id: leagueExternalId,
      season: seasonYear,
      tab,
      is_guest: isGuest,
    });
  }, [consent, isGuest, isReady, leagueExternalId, seasonYear, tab]);

  return null;
}
