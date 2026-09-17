"use client";

import { useEffect, useRef } from "react";

import { useSoundPreference } from "@/hooks/useSoundPreference";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { subscribeUserNotificationsBroadcast } from "@/lib/notifications/subscribe-broadcast";
import { buildNotificationSoundDedupeKey } from "@/lib/sound/match-keys";
import {
  notificationKindToSoundKind,
  tryPlaySound,
  type SoundPrefsSlice,
} from "@/lib/sound/play";

type NotificationSoundListenerProps = {
  userId: string;
};

export function NotificationSoundListener({
  userId,
}: NotificationSoundListenerProps) {
  const documentVisible = useDocumentVisible();
  const { soundGoalEnabled, soundFullTimeEnabled, isAudioUnlocked } =
    useSoundPreference();

  const prefsRef = useRef<SoundPrefsSlice>({
    soundGoalEnabled,
    soundFullTimeEnabled,
  });
  const visibleRef = useRef(documentVisible);
  const unlockedRef = useRef(isAudioUnlocked);

  useEffect(() => {
    prefsRef.current = { soundGoalEnabled, soundFullTimeEnabled };
    visibleRef.current = documentVisible;
    unlockedRef.current = isAudioUnlocked;
  }, [
    documentVisible,
    isAudioUnlocked,
    soundFullTimeEnabled,
    soundGoalEnabled,
  ]);

  useEffect(() => {
    return subscribeUserNotificationsBroadcast(userId, (payload) => {
      const soundKind = notificationKindToSoundKind(payload.kind);
      if (!soundKind) {
        return;
      }

      tryPlaySound({
        kind: soundKind,
        dedupeKey: buildNotificationSoundDedupeKey(
          soundKind,
          payload.notificationId
        ),
        prefs: prefsRef.current,
        documentVisible: visibleRef.current,
        isAudioUnlocked: unlockedRef.current,
      });
    });
  }, [userId]);

  return null;
}
