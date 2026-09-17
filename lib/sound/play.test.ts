import { describe, expect, it, vi, beforeEach } from "vitest";

import { resetSoundDedupeForTests } from "@/lib/sound/dedupe";
import {
  isSoundEnabledForKind,
  notificationKindToSoundKind,
  tryPlaySound,
} from "@/lib/sound/play";

vi.mock("@/lib/sound/synthetic-audio", () => ({
  playSyntheticGoal: vi.fn(),
  playSyntheticFullTime: vi.fn(),
}));

import {
  playSyntheticFullTime,
  playSyntheticGoal,
} from "@/lib/sound/synthetic-audio";

describe("tryPlaySound", () => {
  beforeEach(() => {
    resetSoundDedupeForTests();
    vi.mocked(playSyntheticGoal).mockClear();
    vi.mocked(playSyntheticFullTime).mockClear();
  });

  const basePrefs = {
    soundGoalEnabled: true,
    soundFullTimeEnabled: true,
  };

  it("no-ops when tab hidden", () => {
    expect(
      tryPlaySound({
        kind: "goal",
        dedupeKey: "a",
        prefs: basePrefs,
        documentVisible: false,
        isAudioUnlocked: true,
      })
    ).toBe(false);
    expect(playSyntheticGoal).not.toHaveBeenCalled();
  });

  it("no-ops when audio not unlocked", () => {
    expect(
      tryPlaySound({
        kind: "goal",
        dedupeKey: "a",
        prefs: basePrefs,
        documentVisible: true,
        isAudioUnlocked: false,
      })
    ).toBe(false);
  });

  it("plays goal when enabled", () => {
    expect(
      tryPlaySound({
        kind: "goal",
        dedupeKey: "a",
        prefs: basePrefs,
        documentVisible: true,
        isAudioUnlocked: true,
      })
    ).toBe(true);
    expect(playSyntheticGoal).toHaveBeenCalledOnce();
  });

  it("maps notification kinds", () => {
    expect(notificationKindToSoundKind("GOAL_FOR_FOLLOWED_TEAM")).toBe("goal");
    expect(notificationKindToSoundKind("FULL_TIME_FOLLOWED_TEAM")).toBe(
      "fullTime"
    );
    expect(notificationKindToSoundKind("PREDICTION_SHIFT")).toBeNull();
  });

  it("respects per-kind prefs", () => {
    expect(
      isSoundEnabledForKind("fullTime", {
        soundGoalEnabled: true,
        soundFullTimeEnabled: false,
      })
    ).toBe(false);
    expect(
      tryPlaySound({
        kind: "fullTime",
        dedupeKey: "ft1",
        prefs: { soundGoalEnabled: true, soundFullTimeEnabled: false },
        documentVisible: true,
        isAudioUnlocked: true,
      })
    ).toBe(false);
    expect(playSyntheticFullTime).not.toHaveBeenCalled();
  });
});
