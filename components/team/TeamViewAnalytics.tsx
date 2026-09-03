"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { Team } from "@/types/domain";

import { useCookieConsent } from "@/hooks/useCookieConsent";

type TeamViewAnalyticsProps = {
  team: Team;
  isGuest: boolean;
};

export function TeamViewAnalytics({ team, isGuest }: TeamViewAnalyticsProps) {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }

    captured.current = true;

    void captureClientEvent(POSTHOG_EVENTS.teamViewed, {
      team_id: team.externalId,
      is_guest: isGuest,
    });
  }, [consent, isGuest, isReady, team.externalId]);

  return null;
}
