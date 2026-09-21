"use client";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { AIHeroCard } from "@/components/ai/AIHeroCard";
import { AIHeroFallbackCard } from "@/components/ai/AIHeroFallbackCard";
import { AIHeroLimitState } from "@/components/ai/AIHeroLimitState";
import { AIHeroLockedCard } from "@/components/ai/AIHeroLockedCard";
import { AIHeroMissState } from "@/components/ai/AIHeroMissState";
import { AIHeroSkeleton } from "@/components/ai/AIHeroSkeleton";
import { AIHeroUnavailableState } from "@/components/ai/AIHeroUnavailableState";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { ErrorState } from "@/components/common/ErrorState";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import { Badge } from "@/components/ui/badge";
import type { TeamRef } from "@/types/domain";
import type { PrematchPredictionResult } from "@/types/prediction";

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
    liveWinProbabilities,
    generate,
    refetch,
    isGenerating,
  } = usePrematchInsight();

  if (state === "guest") {
    if (
      fixturePhase === "LIVE" &&
      prediction &&
      prediction.type === "PREMATCH"
    ) {
      return (
        <div className="space-y-4">
          <AIHeroFallbackCard
            prediction={prediction as PrematchPredictionResult}
            mode="generating"
            message="Live model numbers are available below. Sign up free for full live analyst commentary."
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
          {liveWinProbabilities ? (
            <div className="space-y-2 rounded-xl border p-4">
              <Badge variant="live">Live model</Badge>
              <WinProbabilitiesBar
                probabilities={liveWinProbabilities}
                winOutcome={predictedOutcomeFromProbabilities(
                  liveWinProbabilities
                )}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
              />
            </div>
          ) : null}
          <AIHeroLockedCard returnTo={returnTo} />
        </div>
      );
    }

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

  if (state === "generating" && prediction && prediction.type === "PREMATCH") {
    return (
      <AIHeroFallbackCard
        prediction={prediction}
        mode="generating"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        isRetrying={isGenerating}
      />
    );
  }

  if (state === "miss") {
    if (isGenerating) {
      return <AIHeroSkeleton />;
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

  if (state === "fallback" && prediction && prediction.type === "PREMATCH") {
    return (
      <div className="space-y-4">
        <AIHeroFallbackCard
          prediction={prediction as PrematchPredictionResult}
          mode={fixturePhase === "LIVE" ? "generating" : "error"}
          message={fallbackMessage}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onRetry={fixturePhase === "LIVE" ? undefined : () => void generate()}
          isRetrying={isGenerating}
        />
        {fixturePhase === "LIVE" && liveWinProbabilities ? (
          <AIHeroFallbackCard
            prediction={{
              ...(prediction as PrematchPredictionResult),
              winProbabilities: liveWinProbabilities,
              predictedOutcome:
                predictedOutcomeFromProbabilities(liveWinProbabilities),
            }}
            mode="generating"
            message="Current live win probabilities from the in-match model."
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        ) : null}
      </div>
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
      prediction={prediction}
      insightMode={insightMode}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      liveWinProbabilities={liveWinProbabilities}
      supplementalMessage={fallbackMessage}
    />
  );
}
