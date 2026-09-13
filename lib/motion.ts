"use client";

import type { Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

export const MOTION_DURATION = {
  fast: 0.25,
  standard: 0.35,
  heroFade: 0.3,
  livePulse: 1.5,
} as const;

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

export function motionTransition(
  prefersReducedMotion: boolean,
  transition: Transition = {}
): Transition {
  if (prefersReducedMotion) {
    return { duration: 0 };
  }

  return transition;
}

export function pulseKeyframes(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {};
  }

  return {
    scale: [1, 1.15, 1],
    opacity: [1, 0.7, 1],
  };
}

export function livePulseTransition(prefersReducedMotion: boolean): Transition {
  return motionTransition(prefersReducedMotion, {
    duration: MOTION_DURATION.livePulse,
    ease: "easeInOut",
    repeat: Infinity,
  });
}

export function heroContentFade(prefersReducedMotion: boolean): {
  initial: false | { opacity: number };
  animate: { opacity: number };
  transition: Transition;
} {
  return {
    initial: prefersReducedMotion ? false : { opacity: 0.45 },
    animate: { opacity: 1 },
    transition: motionTransition(prefersReducedMotion, {
      duration: MOTION_DURATION.heroFade,
    }),
  };
}

export function valueChangeFade(prefersReducedMotion: boolean): {
  initial: false | { y: number; opacity: number };
  animate: { y: number; opacity: number };
  transition: Transition;
} {
  return {
    initial: prefersReducedMotion ? false : { y: -4, opacity: 0.6 },
    animate: { y: 0, opacity: 1 },
    transition: motionTransition(prefersReducedMotion, {
      duration: MOTION_DURATION.fast,
    }),
  };
}

export function layoutTransition(prefersReducedMotion: boolean): Transition {
  return motionTransition(prefersReducedMotion, {
    duration: MOTION_DURATION.fast,
    ease: "easeOut",
  });
}
