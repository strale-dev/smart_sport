"use client";

import { motion } from "motion/react";

import { useAiUpdatedTicker } from "@/hooks/useAiUpdatedTicker";
import { formatRelativeTime } from "@/lib/ai/format";
import type { PrematchInsightMode } from "@/lib/ai/schemas";
import {
  MOTION_DURATION,
  motionTransition,
  usePrefersReducedMotion,
} from "@/lib/motion";
import { Badge } from "@/components/ui/badge";

type AiUpdatedIndicatorProps = {
  createdAt: string;
  insightMode: PrematchInsightMode;
  insightId: string;
};

function modeLabel(mode: PrematchInsightMode): string {
  if (mode === "live") {
    return "Live AI";
  }
  if (mode === "historical") {
    return "Pre-match AI";
  }
  return "AI";
}

export function AiUpdatedIndicator({
  createdAt,
  insightMode,
  insightId,
}: AiUpdatedIndicatorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  useAiUpdatedTicker(createdAt);

  return (
    <motion.span
      key={insightId}
      initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={motionTransition(prefersReducedMotion, {
        duration: MOTION_DURATION.standard,
      })}
    >
      <Badge variant="outline" className="font-normal">
        {modeLabel(insightMode)} updated {formatRelativeTime(createdAt)}
      </Badge>
    </motion.span>
  );
}
