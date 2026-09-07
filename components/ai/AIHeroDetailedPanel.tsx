"use client";

import Link from "next/link";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { AIHeroCard } from "@/components/ai/AIHeroCard";
import { AIHeroFallbackCard } from "@/components/ai/AIHeroFallbackCard";
import { AIHeroLimitState } from "@/components/ai/AIHeroLimitState";
import { AIHeroMissState } from "@/components/ai/AIHeroMissState";
import { AIHeroSkeleton } from "@/components/ai/AIHeroSkeleton";
import { AIHeroUnavailableState } from "@/components/ai/AIHeroUnavailableState";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { KeyFactorsList } from "@/components/ai/KeyFactorsList";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { ErrorState } from "@/components/common/ErrorState";
import {
  formatExpectedGoalsRange,
  formatRelativeTime,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";
import { AI_DISCLAIMER } from "@/lib/marketing/copy";
import type { TeamRef } from "@/types/domain";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIHeroDetailedPanelProps = {
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
};

export function AIHeroDetailedPanel({
  homeTeam,
  awayTeam,
}: AIHeroDetailedPanelProps) {
  const {
    state,
    insight,
    prediction,
    insightMode,
    limit,
    used,
    errorMessage,
    fallbackMessage,
    generate,
    refetch,
    isGenerating,
  } = usePrematchInsight();

  if (state === "loading") {
    return <AIHeroSkeleton />;
  }

  if (state === "miss") {
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

  if (state === "neither") {
    return (
      <AIHeroUnavailableState
        title="Analysis not available"
        description="This fixture was postponed, cancelled, or otherwise removed from analysis."
      />
    );
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
    <div className="space-y-4">
      <AIHeroCard
        insight={insight}
        insightMode={insightMode}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />

      <Card className="w-full">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-heading text-base">
              Full AI commentary
            </CardTitle>
            <ConfidenceBadge confidence={insight.confidence} />
            <DataQualityChip quality={insight.dataQuality} />
            {insightMode === "historical" ? (
              <Badge variant="outline">Pre-match analysis</Badge>
            ) : null}
          </div>
          <CardDescription>
            {outcomeLabel(insight.winOutcome, homeTeam, awayTeam)} ·{" "}
            {formatRelativeTime(insight.createdAt)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <WinProbabilitiesBar
            probabilities={insight.winProbabilities}
            winOutcome={insight.winOutcome}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />

          <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-3">
            <p>
              Expected goals:{" "}
              {formatExpectedGoalsRange(insight.expectedGoalsRange)}
            </p>
            {insight.weakerTeamScoringChance != null ? (
              <p>
                Underdog threat:{" "}
                {formatWinProbability(insight.weakerTeamScoringChance)}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Commentary</h3>
            <p className="text-sm leading-relaxed">{insight.commentary}</p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Key factors</h3>
            <KeyFactorsList factors={insight.keyFactors} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                ["Likely", insight.scenarios.likely],
                ["Best case", insight.scenarios.best],
                ["Upset", insight.scenarios.upset],
              ] as const
            ).map(([label, text]) => (
              <div
                key={label}
                className="border-border/70 bg-muted/20 rounded-xl border px-4 py-3"
              >
                <p className="text-xs font-medium tracking-wide uppercase">
                  {label}
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2 border-t pt-4">
          <p className="text-muted-foreground text-xs leading-relaxed">
            {AI_DISCLAIMER}
          </p>
          <Link
            href="/methodology"
            className="text-primary text-xs underline-offset-4 hover:underline"
          >
            How our model works
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
