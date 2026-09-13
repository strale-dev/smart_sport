import { describe, expect, it } from "vitest";

import {
  heroContentFade,
  livePulseTransition,
  motionTransition,
  pulseKeyframes,
} from "@/lib/motion";

describe("motionTransition", () => {
  it("zeroes duration when reduced motion is preferred", () => {
    expect(motionTransition(true, { duration: 0.35 })).toEqual({ duration: 0 });
  });

  it("passes through transition when motion is allowed", () => {
    expect(
      motionTransition(false, { duration: 0.35, ease: "easeOut" })
    ).toEqual({ duration: 0.35, ease: "easeOut" });
  });
});

describe("pulseKeyframes", () => {
  it("returns empty object when reduced motion is preferred", () => {
    expect(pulseKeyframes(true)).toEqual({});
  });

  it("returns scale and opacity keyframes when motion is allowed", () => {
    expect(pulseKeyframes(false)).toEqual({
      scale: [1, 1.15, 1],
      opacity: [1, 0.7, 1],
    });
  });
});

describe("livePulseTransition", () => {
  it("disables animation when reduced motion is preferred", () => {
    expect(livePulseTransition(true)).toEqual({ duration: 0 });
  });

  it("uses infinite repeat when motion is allowed", () => {
    expect(livePulseTransition(false)).toMatchObject({
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
    });
  });
});

describe("heroContentFade", () => {
  it("skips initial opacity when reduced motion is preferred", () => {
    expect(heroContentFade(true).initial).toBe(false);
    expect(heroContentFade(true).transition).toEqual({ duration: 0 });
  });

  it("fades from dimmed opacity when motion is allowed", () => {
    const fade = heroContentFade(false);
    expect(fade.initial).toEqual({ opacity: 0.45 });
    expect(fade.animate).toEqual({ opacity: 1 });
    expect(fade.transition).toEqual({ duration: 0.3 });
  });
});
