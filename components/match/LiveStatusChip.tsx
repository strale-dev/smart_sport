"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import {
  motionTransition,
  pulseKeyframes,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type LiveStatusChipProps = {
  minuteLabel?: string | null;
  className?: string;
  animate?: boolean;
};

export function LiveStatusChip({
  minuteLabel,
  className,
  animate = true,
}: LiveStatusChipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: "-20px 0px" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && inView && !prefersReducedMotion;

  return (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {shouldAnimate ? (
        <motion.span
          aria-hidden="true"
          className="bg-live inline-block size-2 shrink-0 rounded-full"
          animate={pulseKeyframes(false)}
          transition={motionTransition(false, {
            duration: 1.5,
            ease: "easeInOut",
            repeat: Infinity,
          })}
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-live inline-block size-2 shrink-0 rounded-full"
        />
      )}
      {minuteLabel ? (
        <Badge variant="live" className="font-mono tabular-nums">
          {minuteLabel}
        </Badge>
      ) : (
        <span className="text-live text-xs font-medium tracking-wide uppercase">
          Live
        </span>
      )}
    </span>
  );
}
