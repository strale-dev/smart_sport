import { describe, expect, it, beforeEach } from "vitest";

import {
  markSoundPlayed,
  resetSoundDedupeForTests,
  shouldPlaySound,
} from "@/lib/sound/dedupe";

describe("sound dedupe", () => {
  beforeEach(() => {
    resetSoundDedupeForTests();
  });

  it("allows first play", () => {
    expect(shouldPlaySound("goal", "k1", 1_000)).toBe(true);
  });

  it("blocks duplicate key within ttl", () => {
    markSoundPlayed("goal", "k1", 1_000);
    expect(shouldPlaySound("goal", "k1", 2_000)).toBe(false);
  });

  it("blocks same kind within min interval even with different keys", () => {
    markSoundPlayed("goal", "k1", 1_000);
    expect(shouldPlaySound("goal", "k2", 2_000)).toBe(false);
    expect(shouldPlaySound("goal", "k2", 2_600)).toBe(true);
  });
});
