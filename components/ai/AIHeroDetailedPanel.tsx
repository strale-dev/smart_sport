"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { AIHeroMotionSection } from "@/components/ai/AIHeroMotionSection";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { AnalysisDataCoverage } from "@/components/ai/AnalysisDataCoverage";
import { PrematchAnalysisSectionsView } from "@/components/ai/PrematchAnalysisSections";
import { KeyFactorsList } from "@/components/ai/KeyFactorsList";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  formatExpectedGoalsRange,
  formatRelativeTime,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";
import { resolveInsightDisplayMetrics } from "@/lib/ai/insight-display-metrics";
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
import { Skeleton } from "@/components/ui/skeleton";

type AIHeroDetailedPanelProps = {
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
};

function AIEngineTabPendingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      icon={SparklesIcon}
      title={title}
      description={description}
      className="border-border/70 bg-card/40 rounded-xl border py-10"
    />
  );
}

export function AIHeroDetailedPanel({
  homeTeam,
  awayTeam,
}: AIHeroDetailedPanelProps) {
  const { state, insight, prediction, insightMode } = usePrematchInsight();

  if (state === "guest") {
    return (
      <AIEngineTabPendingState
        title="Unlock full AI commentary"
        description="Sign up free using the AI hero above the tabs. This tab expands commentary, scenarios, and key factors once you have access."
      />
    );
  }

  if (state === "loading") {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (state !== "ok" || !insight || !insightMode) {
    return (
      <AIEngineTabPendingState
        title="Detailed analysis not ready yet"
        description="Use the AI match analysis card above the tabs to generate or review the summary. Full commentary, scenarios, and extended factors appear here once analysis is available."
      />
    );
  }

  const metrics = resolveInsightDisplayMetrics(insight, prediction);

  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-base">
            Full AI commentary
          </CardTitle>
          <ConfidenceBadge confidence={metrics.confidence} />
          {insightMode === "historical" ? (
            <Badge variant="outline">Pre-match analysis</Badge>
          ) : null}
          {insightMode === "live" ? (
            <Badge variant="live">Live analysis</Badge>
          ) : null}
        </div>
        <CardDescription>
          {outcomeLabel(metrics.winOutcome, homeTeam, awayTeam)} ·{" "}
          {formatRelativeTime(insight.createdAt)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <AIHeroMotionSection motionKey={insight.id}>
          {insight.analysis ? (
            <PrematchAnalysisSectionsView
              analysis={insight.analysis}
              insight={insight}
              prediction={prediction}
            />
          ) : (
            <p className="text-sm leading-relaxed">{insight.commentary}</p>
          )}
        </AIHeroMotionSection>

        <AIHeroMotionSection motionKey={`${insight.id}-probs`}>
          <WinProbabilitiesBar
            probabilities={metrics.winProbabilities}
            winOutcome={metrics.winOutcome}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </AIHeroMotionSection>

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
            <KeyFactorsList factors={insight.keyFactors} />
          </AIHeroMotionSection>
        </div>

        <AIHeroMotionSection motionKey={`${insight.id}-scenarios`}>
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
        </AIHeroMotionSection>
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
  );
}
