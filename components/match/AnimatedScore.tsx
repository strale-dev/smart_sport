"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import {
  MOTION_DURATION,
  motionTransition,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedScoreProps = {
  score: string;
  isLive: boolean;
  className?: string;
  animate?: boolean;
};

export function AnimatedScore({
  score,
  isLive,
  className,
  animate = true,
}: AnimatedScoreProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { margin: "-20px 0px" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const canAnimate = animate && inView && !prefersReducedMotion;

  if (!canAnimate) {
    return (
      <p
        ref={ref}
        aria-live="polite"
        className={cn(
          "font-mono font-semibold tabular-nums",
          isLive && "text-live",
          className
        )}
      >
        {score}
      </p>
    );
  }

  return (
    <motion.p
      ref={ref}
      aria-live="polite"
      key={score}
      initial={{ y: -12, opacity: 0.6 }}
      animate={{ y: 0, opacity: 1 }}
      transition={motionTransition(prefersReducedMotion, {
        duration: MOTION_DURATION.standard,
      })}
      className={cn(
        "font-mono font-semibold tabular-nums",
        isLive && "text-live",
        className
      )}
    >
      {score}
    </motion.p>
  );
}
