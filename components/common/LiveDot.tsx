"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  motionTransition,
  pulseKeyframes,
  usePrefersReducedMotion,
} from "@/lib/motion";

type LiveDotProps = {
  className?: string;
  label?: string;
};

export function LiveDot({ className, label = "Live" }: LiveDotProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <motion.span
        aria-hidden="true"
        className="bg-live inline-block size-2 shrink-0"
        animate={pulseKeyframes(prefersReducedMotion)}
        transition={motionTransition(prefersReducedMotion, {
          duration: 1.5,
          ease: "easeInOut" as const,
        })}
      />
      <span className="text-live text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
    </span>
  );
}
