export const SOUND_SESSION_KEYS = {
  goal: "scorence.sound.goal",
  fullTime: "scorence.sound.fullTime",
  unlocked: "scorence.sound.unlocked",
} as const;

export type SoundSessionPrefs = {
  soundGoalEnabled: boolean;
  soundFullTimeEnabled: boolean;
  isAudioUnlocked: boolean;
};

function readBool(key: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(key) === "1";
}

function writeBool(key: string, value: boolean): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(key, value ? "1" : "0");
}

export function readSoundSessionPrefs(): SoundSessionPrefs {
  return {
    soundGoalEnabled: readBool(SOUND_SESSION_KEYS.goal),
    soundFullTimeEnabled: readBool(SOUND_SESSION_KEYS.fullTime),
    isAudioUnlocked: readBool(SOUND_SESSION_KEYS.unlocked),
  };
}

export function writeSoundSessionGoalEnabled(value: boolean): void {
  writeBool(SOUND_SESSION_KEYS.goal, value);
}

export function writeSoundSessionFullTimeEnabled(value: boolean): void {
  writeBool(SOUND_SESSION_KEYS.fullTime, value);
}

export function writeSoundSessionUnlocked(value: boolean): void {
  writeBool(SOUND_SESSION_KEYS.unlocked, value);
}
