"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { updateSoundPreferences } from "@/lib/preferences/sound.actions";
import type { SoundPreferences } from "@/lib/preferences/sound.server";
import { unlockSoundAudio } from "@/lib/sound/synthetic-audio";
import { NotificationSoundListener } from "@/components/sound/NotificationSoundListener";
import {
  readSoundSessionPrefs,
  writeSoundSessionFullTimeEnabled,
  writeSoundSessionGoalEnabled,
  writeSoundSessionUnlocked,
} from "@/lib/sound/session-storage";

export type SoundPreferenceContextValue = {
  soundGoalEnabled: boolean;
  soundFullTimeEnabled: boolean;
  isAudioUnlocked: boolean;
  isAuthenticated: boolean;
  setSoundGoalEnabled: (value: boolean) => void;
  setSoundFullTimeEnabled: (value: boolean) => void;
  unlockAudio: () => Promise<boolean>;
};

const SoundPreferenceContext =
  createContext<SoundPreferenceContextValue | null>(null);

type SoundPreferencesProviderProps = {
  children: ReactNode;
  userId: string | null;
  initialServerPrefs: SoundPreferences | null;
};

function initialPrefs(
  userId: string | null,
  initialServerPrefs: SoundPreferences | null
): Pick<
  SoundPreferenceContextValue,
  "soundGoalEnabled" | "soundFullTimeEnabled" | "isAudioUnlocked"
> {
  if (userId && initialServerPrefs) {
    return {
      soundGoalEnabled: initialServerPrefs.soundGoalEnabled,
      soundFullTimeEnabled: initialServerPrefs.soundFullTimeEnabled,
      isAudioUnlocked: false,
    };
  }

  if (typeof window !== "undefined") {
    const session = readSoundSessionPrefs();
    return {
      soundGoalEnabled: session.soundGoalEnabled,
      soundFullTimeEnabled: session.soundFullTimeEnabled,
      isAudioUnlocked: session.isAudioUnlocked,
    };
  }

  return {
    soundGoalEnabled: false,
    soundFullTimeEnabled: false,
    isAudioUnlocked: false,
  };
}

export function SoundPreferencesProvider({
  children,
  userId,
  initialServerPrefs,
}: SoundPreferencesProviderProps) {
  const [soundGoalEnabled, setSoundGoalEnabledState] = useState(
    () => initialPrefs(userId, initialServerPrefs).soundGoalEnabled
  );
  const [soundFullTimeEnabled, setSoundFullTimeEnabledState] = useState(
    () => initialPrefs(userId, initialServerPrefs).soundFullTimeEnabled
  );
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(
    () => initialPrefs(userId, initialServerPrefs).isAudioUnlocked
  );

  const isAuthenticated = userId != null;

  const soundGoalEnabledRef = useRef(soundGoalEnabled);
  const soundFullTimeEnabledRef = useRef(soundFullTimeEnabled);

  useEffect(() => {
    soundGoalEnabledRef.current = soundGoalEnabled;
    soundFullTimeEnabledRef.current = soundFullTimeEnabled;
  }, [soundFullTimeEnabled, soundGoalEnabled]);

  useEffect(() => {
    const session = readSoundSessionPrefs();
    if (!userId) {
      // Hydrate guest toggles from sessionStorage after SSR (client-only store).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydration
      setSoundGoalEnabledState(session.soundGoalEnabled);
      setSoundFullTimeEnabledState(session.soundFullTimeEnabled);
    }
    if (session.isAudioUnlocked) {
      setIsAudioUnlocked(true);
    }
  }, [userId]);

  const persistGoal = useCallback(
    async (value: boolean, previous: boolean) => {
      if (!isAuthenticated) {
        writeSoundSessionGoalEnabled(value);
        return;
      }
      const result = await updateSoundPreferences({ soundGoalEnabled: value });
      if (!result.ok) {
        setSoundGoalEnabledState(previous);
      }
    },
    [isAuthenticated]
  );

  const persistFullTime = useCallback(
    async (value: boolean, previous: boolean) => {
      if (!isAuthenticated) {
        writeSoundSessionFullTimeEnabled(value);
        return;
      }
      const result = await updateSoundPreferences({
        soundFullTimeEnabled: value,
      });
      if (!result.ok) {
        setSoundFullTimeEnabledState(previous);
      }
    },
    [isAuthenticated]
  );

  const unlockAudio = useCallback(async () => {
    const ok = await unlockSoundAudio();
    if (ok) {
      setIsAudioUnlocked(true);
      writeSoundSessionUnlocked(true);
    }
    return ok;
  }, []);

  const setSoundGoalEnabled = useCallback(
    (value: boolean) => {
      const previous = soundGoalEnabledRef.current;
      if (previous === value) {
        return;
      }
      setSoundGoalEnabledState(value);
      void persistGoal(value, previous);
    },
    [persistGoal]
  );

  const setSoundFullTimeEnabled = useCallback(
    (value: boolean) => {
      const previous = soundFullTimeEnabledRef.current;
      if (previous === value) {
        return;
      }
      setSoundFullTimeEnabledState(value);
      void persistFullTime(value, previous);
    },
    [persistFullTime]
  );

  const value = useMemo<SoundPreferenceContextValue>(
    () => ({
      soundGoalEnabled,
      soundFullTimeEnabled,
      isAudioUnlocked,
      isAuthenticated,
      setSoundGoalEnabled,
      setSoundFullTimeEnabled,
      unlockAudio,
    }),
    [
      isAudioUnlocked,
      isAuthenticated,
      setSoundFullTimeEnabled,
      setSoundGoalEnabled,
      soundFullTimeEnabled,
      soundGoalEnabled,
      unlockAudio,
    ]
  );

  return (
    <SoundPreferenceContext.Provider value={value}>
      {userId ? <NotificationSoundListener userId={userId} /> : null}
      {children}
    </SoundPreferenceContext.Provider>
  );
}

export function useSoundPreference(): SoundPreferenceContextValue {
  const ctx = useContext(SoundPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useSoundPreference must be used within SoundPreferencesProvider"
    );
  }
  return ctx;
}
