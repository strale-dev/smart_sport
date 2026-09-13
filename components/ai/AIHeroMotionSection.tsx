"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { heroContentFade, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AIHeroMotionSectionProps = {
  motionKey: string;
  children: ReactNode;
  className?: string;
};

export function AIHeroMotionSection({
  motionKey,
  children,
  className,
}: AIHeroMotionSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const fade = heroContentFade(prefersReducedMotion);

  return (
    <motion.div
      key={motionKey}
      className={cn(className)}
      initial={fade.initial}
      animate={fade.animate}
      transition={fade.transition}
    >
      {children}
    </motion.div>
  );
}
