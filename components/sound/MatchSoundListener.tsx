"use client";

import { useEffect, useRef } from "react";

import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { useSoundPreference } from "@/hooks/useSoundPreference";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import {
  buildMatchFullTimeDedupeKey,
  buildMatchGoalDedupeKey,
  didTransitionLiveToFinished,
} from "@/lib/sound/match-keys";
import { tryPlaySound } from "@/lib/sound/play";
import type { FixtureStatus } from "@/types/domain";

export function MatchSoundListener({
  fixtureProviderId,
}: {
  fixtureProviderId: number;
}) {
  const live = useMatchLiveContext();
  const documentVisible = useDocumentVisible();
  const { soundGoalEnabled, soundFullTimeEnabled, isAudioUnlocked } =
    useSoundPreference();

  const statusRef = useRef<FixtureStatus | null>(null);
  const skippedInitialStatusRef = useRef(false);
  const lastEventKeyRef = useRef<string | null>(null);

  const fixtureStatus = live?.fixture.status;

  useEffect(() => {
    if (fixtureStatus === undefined) {
      return;
    }

    const status = fixtureStatus;
    if (!skippedInitialStatusRef.current) {
      skippedInitialStatusRef.current = true;
      statusRef.current = status;
      return;
    }

    const prev = statusRef.current;
    statusRef.current = status;

    if (didTransitionLiveToFinished(prev, status)) {
      tryPlaySound({
        kind: "fullTime",
        dedupeKey: buildMatchFullTimeDedupeKey(fixtureProviderId),
        prefs: { soundGoalEnabled, soundFullTimeEnabled },
        documentVisible,
        isAudioUnlocked,
      });
    }
  }, [
    documentVisible,
    fixtureProviderId,
    fixtureStatus,
    isAudioUnlocked,
    soundFullTimeEnabled,
    soundGoalEnabled,
  ]);

  useEffect(() => {
    const event = live?.lastMeaningfulEvent;
    if (!event || event.kind !== "GOAL") {
      return;
    }

    const dedupeKey = buildMatchGoalDedupeKey(fixtureProviderId, event);
    if (lastEventKeyRef.current === dedupeKey) {
      return;
    }
    lastEventKeyRef.current = dedupeKey;

    tryPlaySound({
      kind: "goal",
      dedupeKey,
      prefs: { soundGoalEnabled, soundFullTimeEnabled },
      documentVisible,
      isAudioUnlocked,
    });
  }, [
    documentVisible,
    fixtureProviderId,
    isAudioUnlocked,
    live?.lastMeaningfulEvent,
    soundFullTimeEnabled,
    soundGoalEnabled,
  ]);

  return null;
}
