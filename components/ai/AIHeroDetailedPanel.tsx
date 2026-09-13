"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { KeyFactorsList } from "@/components/ai/KeyFactorsList";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { EmptyState } from "@/components/common/EmptyState";
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
  const { state, insight, insightMode } = usePrematchInsight();

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

  return (
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
          {insightMode === "live" ? (
            <Badge variant="live">Live analysis</Badge>
          ) : null}
        </div>
        <CardDescription>
          {outcomeLabel(insight.winOutcome, homeTeam, awayTeam)} ·{" "}
          {formatRelativeTime(insight.createdAt)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm leading-relaxed">{insight.commentary}</p>

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
  );
}
