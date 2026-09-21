"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { AIHeroMotionSection } from "@/components/ai/AIHeroMotionSection";
import { AiUpdatedIndicator } from "@/components/ai/AiUpdatedIndicator";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { AnalysisDataCoverage } from "@/components/ai/AnalysisDataCoverage";
import { KeyFactorsList } from "@/components/ai/KeyFactorsList";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import {
  formatExpectedGoalsRange,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";
import { resolveInsightDisplayMetrics } from "@/lib/ai/insight-display-metrics";
import type { StoredAIInsight } from "@/lib/ai/schemas";
import type { PrematchInsightMode } from "@/lib/ai/schemas";
import type { TeamRef } from "@/types/domain";
import type { InsightDisplayPrediction } from "@/lib/ai/insight-display-metrics";
import { predictedOutcomeFromProbabilities } from "@/lib/models/confidence";
import { AI_DISCLAIMER } from "@/lib/marketing/copy";
import type { WinProbabilities } from "@/types/prediction";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { Badge } from "@/components/ui/badge";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIHeroCardProps = {
  insight: StoredAIInsight;
  prediction: InsightDisplayPrediction | null;
  insightMode: PrematchInsightMode;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  liveWinProbabilities?: WinProbabilities | null;
  supplementalMessage?: string | null;
};

export function AIHeroCard({
  insight,
  prediction,
  insightMode,
  homeTeam,
  awayTeam,
  liveWinProbabilities = null,
  supplementalMessage = null,
}: AIHeroCardProps) {
  const metrics = resolveInsightDisplayMetrics(insight, prediction);

  return (
    <AIHeroShell variant="default">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            AI match analysis
          </CardTitle>
          {insightMode === "historical" ? (
            <Badge variant="outline">Pre-match analysis</Badge>
          ) : null}
          {insightMode === "live" ? (
            <Badge variant="live">Live analysis</Badge>
          ) : null}
          <ConfidenceBadge confidence={metrics.confidence} />
          <AiUpdatedIndicator
            createdAt={insight.createdAt}
            insightMode={insightMode}
            insightId={insight.id}
          />
        </div>
        <AIHeroMotionSection motionKey={insight.id}>
          <CardDescription className="text-foreground/90 max-w-3xl text-base">
            {insight.summary}
          </CardDescription>
          <p className="text-muted-foreground mt-2 text-xs">
            {outcomeLabel(metrics.winOutcome, homeTeam, awayTeam)}
          </p>
        </AIHeroMotionSection>
      </CardHeader>

      <CardContent className="space-y-5">
        <AIHeroMotionSection motionKey={`${insight.id}-probs`}>
          <WinProbabilitiesBar
            probabilities={metrics.winProbabilities}
            winOutcome={metrics.winOutcome}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </AIHeroMotionSection>

        {liveWinProbabilities && insightMode === "historical" ? (
          <div className="border-border/60 space-y-2 border-t pt-4">
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

        {supplementalMessage ? (
          <p className="text-muted-foreground text-sm">{supplementalMessage}</p>
        ) : null}

        <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-3">
          <p>
            Expected goals:{" "}
            {formatExpectedGoalsRange(metrics.expectedGoalsRange)}
            {metrics.expectedGoalsTotal != null
              ? ` (μ ${metrics.expectedGoalsTotal.toFixed(1)})`
              : null}
          </p>
          {metrics.over2Prob != null ? (
            <p>Over 2.5: {formatWinProbability(metrics.over2Prob)}</p>
          ) : null}
          {metrics.over3Prob != null ? (
            <p>Over 3.5: {formatWinProbability(metrics.over3Prob)}</p>
          ) : null}
          {metrics.weakerTeamScoringChance != null ? (
            <p>
              Underdog threat:{" "}
              {formatWinProbability(metrics.weakerTeamScoringChance)}
            </p>
          ) : null}
        </div>

        <AnalysisDataCoverage
          coverage={insight.dataCoverage}
          dataUsedFallback={insight.dataUsed}
        />

        <div>
          <h3 className="mb-3 text-sm font-medium">Key factors</h3>
          <AIHeroMotionSection motionKey={`${insight.id}-factors`}>
            <KeyFactorsList factors={insight.keyFactors} limit={4} />
          </AIHeroMotionSection>
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
    </AIHeroShell>
  );
}
