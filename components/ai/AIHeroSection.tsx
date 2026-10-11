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
  WinProbabilities,
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

function LiveModelProbabilitiesBlock({
  liveWinProbabilities,
  homeTeam,
  awayTeam,
  message,
}: {
  liveWinProbabilities: WinProbabilities;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  message?: string | null;
}) {
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <Badge variant="live">Live model</Badge>
      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
      <WinProbabilitiesBar
        probabilities={liveWinProbabilities}
        winOutcome={predictedOutcomeFromProbabilities(liveWinProbabilities)}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>
  );
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
    fallbackMessage,
    liveWinProbabilities,
    generate,
    refetch,
    isGenerating,
    displayExperience,
    contextStale,
    generationFailureMessage,
    aiUiState,
    aiUiCopy,
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
            <LiveModelProbabilitiesBlock
              liveWinProbabilities={liveWinProbabilities}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
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
        title={aiUiCopy.title}
        description={aiUiCopy.description ?? undefined}
      />
    );
  }

  if (state === "limit" && limit != null && used != null) {
    return <AIHeroLimitState limit={limit} used={used} />;
  }

  if (aiUiState === "AI_LOADING" && aiUiCopy.showSkeleton && !prematch) {
    return <AIHeroSkeleton />;
  }

  if (aiUiState === "AI_FAILED") {
    return (
      <div className="space-y-4">
        {prematch ? (
          <AIHeroFallbackCard
            prediction={prematch}
            mode="error"
            message={aiUiCopy.description}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onRetry={aiUiCopy.showRetry ? () => void generate() : undefined}
            isRetrying={isGenerating}
          />
        ) : (
          <ErrorState
            title={aiUiCopy.title}
            description={aiUiCopy.description ?? undefined}
            onRetry={aiUiCopy.showRetry ? () => void refetch() : undefined}
          />
        )}
        {fixturePhase === "LIVE" && liveWinProbabilities ? (
          <LiveModelProbabilitiesBlock
            liveWinProbabilities={liveWinProbabilities}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        ) : null}
      </div>
    );
  }

  if (
    aiUiState === "AI_READY" &&
    displayExperience.showNarrative &&
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
        generationFailureMessage={generationFailureMessage}
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
      aiUiCopy.description ?? fallbackMessage ?? displayExperience.description;

    const mode =
      aiUiState === "AI_LOADING" || aiUiState === "AI_NOT_READY" || isGenerating
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
          isRetrying={isGenerating}
        />
        {fixturePhase === "LIVE" && liveWinProbabilities ? (
          <LiveModelProbabilitiesBlock
            liveWinProbabilities={liveWinProbabilities}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            message="Current live win probabilities from the in-match model."
          />
        ) : null}
      </div>
    );
  }

  if (aiUiState === "AI_NOT_READY") {
    return (
      <AIHeroShell variant="plain">
        <AIHeroUnavailableState
          title={aiUiCopy.title}
          description={aiUiCopy.description ?? undefined}
        />
      </AIHeroShell>
    );
  }

  if (aiUiState === "AI_UNAVAILABLE" || aiUiState === "NO_DATA") {
    return (
      <AIHeroShell variant="plain">
        {aiUiState === "NO_DATA" && displayExperience.headline ? (
          <AIEngineAnalysisNotice
            experience={displayExperience}
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <AIHeroUnavailableState
            title={aiUiCopy.title}
            description={aiUiCopy.description ?? undefined}
          />
        )}
      </AIHeroShell>
    );
  }

  if (state === "unavailable") {
    return (
      <AIHeroUnavailableState
        title={aiUiCopy.title}
        description={aiUiCopy.description ?? undefined}
      />
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
