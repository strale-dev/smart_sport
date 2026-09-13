"use client";

import { motion } from "motion/react";

import { formatWinProbability } from "@/lib/ai/format";
import type { AIInsightPayload } from "@/lib/ai/schemas";
import {
  layoutTransition,
  usePrefersReducedMotion,
  valueChangeFade,
} from "@/lib/motion";
import type { TeamRef } from "@/types/domain";

import { cn } from "@/lib/utils";

type WinProbabilitiesBarProps = {
  probabilities: AIInsightPayload["winProbabilities"];
  winOutcome: AIInsightPayload["winOutcome"];
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  className?: string;
};

function segmentClass(isHighlighted: boolean): string {
  return cn(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-center transition-colors",
    isHighlighted ? "bg-primary/15 ring-primary/30 ring-1" : "bg-muted/40"
  );
}

export function WinProbabilitiesBar({
  probabilities,
  winOutcome,
  homeTeam,
  awayTeam,
  className,
}: WinProbabilitiesBarProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const valueMotion = valueChangeFade(prefersReducedMotion);
  const layoutMotion = layoutTransition(prefersReducedMotion);

  const segments = [
    {
      key: "1" as const,
      label: homeTeam.code ?? "Home",
      value: probabilities.home,
    },
    {
      key: "X" as const,
      label: "Draw",
      value: probabilities.draw,
    },
    {
      key: "2" as const,
      label: awayTeam.code ?? "Away",
      value: probabilities.away,
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {segments.map((segment) => {
        const isHighlighted = winOutcome === segment.key;
        const formatted = formatWinProbability(segment.value);

        return (
          <motion.div
            key={segment.key}
            layout={!prefersReducedMotion}
            transition={layoutMotion}
            className={segmentClass(isHighlighted)}
          >
            <span className="text-muted-foreground truncate text-xs">
              {segment.label}
            </span>
            <motion.span
              key={formatted}
              className="font-heading text-lg font-semibold tabular-nums"
              initial={valueMotion.initial}
              animate={valueMotion.animate}
              transition={valueMotion.transition}
            >
              {formatted}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
