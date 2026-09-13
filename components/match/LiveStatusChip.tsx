"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import {
  livePulseTransition,
  pulseKeyframes,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type LiveStatusChipProps = {
  minuteLabel?: string | null;
  className?: string;
  animate?: boolean;
  appearance?: "default" | "compact";
};

function LivePulseDot({ shouldAnimate }: { shouldAnimate: boolean }) {
  if (shouldAnimate) {
    return (
      <motion.span
        aria-hidden="true"
        className="bg-live inline-block size-2 shrink-0 rounded-full"
        animate={pulseKeyframes(false)}
        transition={livePulseTransition(false)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="bg-live inline-block size-2 shrink-0 rounded-full"
    />
  );
}

export function LiveStatusChip({
  minuteLabel,
  className,
  animate = true,
  appearance = "default",
}: LiveStatusChipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: "-20px 0px" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && inView && !prefersReducedMotion;

  if (appearance === "compact") {
    return (
      <span
        ref={ref}
        className={cn("inline-flex shrink-0 items-center", className)}
        aria-label="Live"
      >
        <LivePulseDot shouldAnimate={shouldAnimate} />
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <LivePulseDot shouldAnimate={shouldAnimate} />
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
