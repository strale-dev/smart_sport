"use client";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { AIEngineAnalysisNotice } from "@/components/ai/AIEngineAnalysisNotice";
import { AIHeroCard } from "@/components/ai/AIHeroCard";
import { AIHeroFallbackCard } from "@/components/ai/AIHeroFallbackCard";
import { AIHeroLimitState } from "@/components/ai/AIHeroLimitState";
import { AIHeroLockedCard } from "@/components/ai/AIHeroLockedCard";
import { AIHeroSkeleton } from "@/components/ai/AIHeroSkeleton";
import { AIHeroUnavailableState } from "@/components/ai/AIHeroUnavailableState";
import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { ErrorState } from "@/components/common/ErrorState";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import { Badge } from "@/components/ui/badge";
import type { TeamRef } from "@/types/domain";
import type {
  LivePredictionResult,
  PrematchPredictionResult,
} from "@/types/prediction";

type AIHeroSectionProps = {
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  returnTo: string;
};

function prematchPrediction(
  prediction: PrematchPredictionResult | LivePredictionResult | null
): PrematchPredictionResult | null {
  return prediction?.type === "PREMATCH" ? prediction : null;
}

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
    displayExperience,
    contextStale,
  } = usePrematchInsight();

  const prematch = prematchPrediction(prediction);

  if (state === "guest") {
    if (
      fixturePhase === "LIVE" &&
      displayExperience.showModelPrediction &&
      prematch
    ) {
      return (
        <div className="space-y-4">
          <AIHeroFallbackCard
            prediction={prematch}
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

  if (state === "unavailable") {
    return <AIHeroUnavailableState />;
  }

  if (state === "limit" && limit != null && used != null) {
    return <AIHeroLimitState limit={limit} used={used} />;
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

  if (
    displayExperience.showNarrative &&
    state === "ok" &&
    insight &&
    insightMode
  ) {
    return (
      <AIHeroCard
        insight={insight}
        prediction={prediction}
        insightMode={insightMode}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        liveWinProbabilities={liveWinProbabilities}
        supplementalMessage={fallbackMessage}
        contextStale={contextStale}
        isRefreshing={isGenerating}
      />
    );
  }

  if (
    displayExperience.tier === "scheduled" ||
    (!displayExperience.showModelPrediction && !displayExperience.showNarrative)
  ) {
    return (
      <AIHeroShell variant="plain">
        <AIEngineAnalysisNotice
          experience={displayExperience}
          className="border-0 bg-transparent py-6"
        />
      </AIHeroShell>
    );
  }

  if (displayExperience.showModelPrediction && prematch) {
    const modelMessage =
      state === "fallback"
        ? (fallbackMessage ?? displayExperience.description)
        : displayExperience.description;

    const mode =
      state === "fallback"
        ? fixturePhase === "LIVE"
          ? "generating"
          : "error"
        : state === "generating" || isGenerating
          ? "generating"
          : "generating";

    return (
      <div className="space-y-4">
        <AIHeroFallbackCard
          prediction={prematch}
          mode={mode}
          message={modelMessage}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onRetry={
            state === "fallback" && fixturePhase !== "LIVE"
              ? () => void generate()
              : undefined
          }
          isRetrying={isGenerating}
        />
        {fixturePhase === "LIVE" && liveWinProbabilities ? (
          <AIHeroFallbackCard
            prediction={{
              ...prematch,
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

  if (state === "miss" && isGenerating) {
    return <AIHeroSkeleton />;
  }

  return (
    <AIHeroShell variant="plain">
      <AIEngineAnalysisNotice
        experience={displayExperience}
        className="border-0 bg-transparent py-6"
      />
    </AIHeroShell>
  );
}
