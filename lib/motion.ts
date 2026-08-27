"use client";

import type { Transition } from "motion/react";
import { useReducedMotion } from "motion/react";

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
