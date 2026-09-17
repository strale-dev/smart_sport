import { markSoundPlayed, shouldPlaySound } from "@/lib/sound/dedupe";
import {
  playSyntheticFullTime,
  playSyntheticGoal,
} from "@/lib/sound/synthetic-audio";

export type SoundKind = "goal" | "fullTime";

export type SoundPrefsSlice = {
  soundGoalEnabled: boolean;
  soundFullTimeEnabled: boolean;
};

export type TryPlaySoundInput = {
  kind: SoundKind;
  dedupeKey: string;
  prefs: SoundPrefsSlice;
  documentVisible: boolean;
  isAudioUnlocked: boolean;
};

export function notificationKindToSoundKind(kind: string): SoundKind | null {
  switch (kind) {
    case "GOAL_FOR_FOLLOWED_TEAM":
      return "goal";
    case "FULL_TIME_FOLLOWED_TEAM":
      return "fullTime";
    default:
      return null;
  }
}

export function isSoundEnabledForKind(
  kind: SoundKind,
  prefs: SoundPrefsSlice
): boolean {
  return kind === "goal" ? prefs.soundGoalEnabled : prefs.soundFullTimeEnabled;
}

export function tryPlaySound(input: TryPlaySoundInput): boolean {
  const { kind, dedupeKey, prefs, documentVisible, isAudioUnlocked } = input;

  if (!documentVisible || !isAudioUnlocked) {
    return false;
  }

  if (!isSoundEnabledForKind(kind, prefs)) {
    return false;
  }

  if (!shouldPlaySound(kind, dedupeKey)) {
    return false;
  }

  if (kind === "goal") {
    playSyntheticGoal();
  } else {
    playSyntheticFullTime();
  }

  markSoundPlayed(kind, dedupeKey);
  return true;
}
