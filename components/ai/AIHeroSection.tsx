"use client";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { AIHeroCard } from "@/components/ai/AIHeroCard";
import { AIHeroFallbackCard } from "@/components/ai/AIHeroFallbackCard";
import { AIHeroLimitState } from "@/components/ai/AIHeroLimitState";
import { AIHeroLockedCard } from "@/components/ai/AIHeroLockedCard";
import { AIHeroMissState } from "@/components/ai/AIHeroMissState";
import { AIHeroSkeleton } from "@/components/ai/AIHeroSkeleton";
import { AIHeroUnavailableState } from "@/components/ai/AIHeroUnavailableState";
import { ErrorState } from "@/components/common/ErrorState";
import type { TeamRef } from "@/types/domain";

type AIHeroSectionProps = {
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  returnTo: string;
};

export function AIHeroSection({
  homeTeam,
  awayTeam,
  returnTo,
}: AIHeroSectionProps) {
  const {
    state,
    insight,
    prediction,
    insightMode,
    fixturePhase,
    limit,
    used,
    errorMessage,
    fallbackMessage,
    generate,
    refetch,
    isGenerating,
  } = usePrematchInsight();

  if (state === "guest") {
    return <AIHeroLockedCard returnTo={returnTo} />;
  }

  if (state === "neither") {
    return (
      <AIHeroUnavailableState
        title="Analysis not available"
        description="This fixture was postponed, cancelled, or otherwise removed from analysis."
      />
    );
  }

  if (state === "loading") {
    return <AIHeroSkeleton />;
  }

  if (state === "miss") {
    if (fixturePhase === "LIVE") {
      return (
        <AIHeroUnavailableState
          title="Live AI warming up"
          description="Analysis refreshes automatically after goals, cards, and other meaningful match events."
        />
      );
    }

    return (
      <AIHeroMissState
        onGenerate={() => void generate()}
        isGenerating={isGenerating}
      />
    );
  }

  if (state === "unavailable") {
    return <AIHeroUnavailableState />;
  }

  if (state === "limit" && limit != null && used != null) {
    return <AIHeroLimitState limit={limit} used={used} />;
  }

  if (state === "fallback" && prediction) {
    return (
      <AIHeroFallbackCard
        prediction={prediction}
        message={fallbackMessage}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onRetry={() => void generate()}
        isRetrying={isGenerating}
      />
    );
  }

  if (state === "error") {
    return (
      <ErrorState
        title="Could not load AI analysis"
        description={errorMessage ?? undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  if (state !== "ok" || !insight || !insightMode) {
    return <AIHeroSkeleton />;
  }

  return (
    <AIHeroCard
      insight={insight}
      insightMode={insightMode}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
    />
  );
}
