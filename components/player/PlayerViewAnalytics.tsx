"use client";

import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { Player } from "@/types/domain";

import { useCookieConsent } from "@/hooks/useCookieConsent";

type PlayerViewAnalyticsProps = {
  player: Player;
  isGuest: boolean;
};

export function PlayerViewAnalytics({
  player,
  isGuest,
}: PlayerViewAnalyticsProps) {
  const { consent, isReady } = useCookieConsent();
  const captured = useRef(false);

  useEffect(() => {
    if (!isReady || captured.current || !hasAnalyticsConsent(consent)) {
      return;
    }

    captured.current = true;

    void captureClientEvent(POSTHOG_EVENTS.playerViewed, {
      player_id: player.externalId,
      is_guest: isGuest,
    });
  }, [consent, isGuest, isReady, player.externalId]);

  return null;
}
