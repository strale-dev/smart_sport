"use client";

import dynamic from "next/dynamic";

import { AIHeroSkeleton } from "@/components/ai/AIHeroSkeleton";
import type { TeamRef } from "@/types/domain";

const AIHeroSectionLazy = dynamic(
  () =>
    import("@/components/ai/AIHeroSection").then(
      (module) => module.AIHeroSection
    ),
  {
    loading: () => <AIHeroSkeleton />,
  }
);

type MatchAIHeroSectionProps = {
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  returnTo: string;
};

export function MatchAIHeroSection(props: MatchAIHeroSectionProps) {
  return <AIHeroSectionLazy {...props} />;
}
