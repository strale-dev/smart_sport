"use client";

import Link from "next/link";
import { SparklesIcon, TrendingUpIcon } from "lucide-react";

import { AIEngineAnalysisNotice } from "@/components/ai/AIEngineAnalysisNotice";
import { usePrematchInsight } from "@/components/ai/AIInsightProvider";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { AnalysisDataCoverage } from "@/components/ai/AnalysisDataCoverage";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatExpectedGoalsRange,
  formatRelativeTime,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";
import type { PrematchPredictionDeltaSnapshot } from "@/lib/live/live-probability-delta";
import { resolveInsightDisplayMetrics } from "@/lib/ai/insight-display-metrics";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import type { MatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import { evaluatePrematchPredictionAccuracy } from "@/lib/match/evaluate-prediction-accuracy";
import type { Fixture } from "@/types/domain";
import type { WinProbabilities } from "@/types/prediction";

type OverviewAiEngineCardProps = {
  fixture: Fixture;
  renderMode: MatchOverviewRenderMode;
  returnTo: string;
};

function DeltaRow({
  label,
  from,
  to,
}: {
  label: string;
  from: number | null;
  to: number | null;
}) {
  if (from == null && to == null) {
    return null;
  }

  const delta =
    from != null && to != null ? Number((to - from).toFixed(3)) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        {from != null ? formatWinProbability(from) : "—"} →{" "}
        {to != null ? formatWinProbability(to) : "—"}
        {delta != null && Math.abs(delta) >= 0.005 ? (
          <span
            className={
              delta > 0 ? "ml-2 text-emerald-500" : "ml-2 text-red-400"
            }
          >
            {delta > 0 ? "▲" : "▼"} {formatWinProbability(Math.abs(delta))}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function renderProbabilityDelta(
  prematch: WinProbabilities | null,
  live: WinProbabilities | null
) {
  return (
    <div className="space-y-2">
      <DeltaRow
        label="Home"
        from={prematch?.home ?? null}
        to={live?.home ?? null}
      />
      <DeltaRow
        label="Draw"
        from={prematch?.draw ?? null}
        to={live?.draw ?? null}
      />
      <DeltaRow
        label="Away"
        from={prematch?.away ?? null}
        to={live?.away ?? null}
      />
    </div>
  );
}

function FinishedPredictionReview({
  fixture,
  snapshot,
  insightSummary,
  insightCreatedAt,
}: {
  fixture: Fixture;
  snapshot: PrematchPredictionDeltaSnapshot;
  insightSummary: string | null;
  insightCreatedAt: string | null;
}) {
  const rows = evaluatePrematchPredictionAccuracy(fixture, snapshot);
  const scoreHome = fixture.score.fulltimeHome ?? fixture.score.home ?? null;
  const scoreAway = fixture.score.fulltimeAway ?? fixture.score.away ?? null;

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="border-border/60 space-y-4 border-t pt-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Prediction made before kickoff</p>
        <p className="text-muted-foreground text-xs">
          Model {snapshot.modelVersion} · saved{" "}
          {formatRelativeTime(snapshot.createdAt)}
        </p>
        <p className="text-muted-foreground text-xs">
          Expected total μ {snapshot.expectedGoalsTotal.toFixed(1)} · range{" "}
          {formatExpectedGoalsRange([
            snapshot.expectedGoalsTotalMin,
            snapshot.expectedGoalsTotalMax,
          ])}
        </p>
      </div>

      {insightSummary ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Original AI analysis</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {insightSummary}
          </p>
          {insightCreatedAt ? (
            <p className="text-muted-foreground text-xs">
              Generated {formatRelativeTime(insightCreatedAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      {scoreHome != null && scoreAway != null ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Actual result</p>
          <p className="font-mono text-sm tabular-nums">
            {fixture.homeTeam.name} {scoreHome}–{scoreAway}{" "}
            {fixture.awayTeam.name}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Prediction review</p>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.label}</p>
                <p className="text-muted-foreground text-xs">
                  Predicted {row.predicted} · Actual {row.actual}
                </p>
              </div>
              <Badge variant={row.hit ? "default" : "destructive"}>
                {row.hit ? "Hit" : "Miss"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreMatchAiEngineCard({ fixture }: { fixture: Fixture }) {
  const homeTeam = fixture.homeTeam;
  const awayTeam = fixture.awayTeam;
  const {
    state,
    insight,
    insightMode,
    prediction,
    displayExperience,
    aiUiState,
    aiUiCopy,
  } = usePrematchInsight();

  if (aiUiState === "AI_LOADING" && aiUiCopy.showSkeleton) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle className="flex items-center gap-2">
            <SparklesIcon aria-hidden className="size-4" />
            AI engine
          </MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent className="space-y-3">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-16 w-full" />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  if (
    aiUiState === "AI_UNAVAILABLE" ||
    aiUiState === "AI_NOT_READY" ||
    aiUiState === "NO_DATA"
  ) {
    if (
      !displayExperience.showModelPrediction &&
      !prediction &&
      aiUiCopy.description
    ) {
      return (
        <MatchAnalyticsCard>
          <MatchCardHeader>
            <MatchCardTitle className="flex items-center gap-2">
              <SparklesIcon aria-hidden className="size-4" />
              AI engine
            </MatchCardTitle>
          </MatchCardHeader>
          <MatchCardContent>
            <p className="text-muted-foreground text-sm">
              {aiUiCopy.description}
            </p>
          </MatchCardContent>
        </MatchAnalyticsCard>
      );
    }
  }

  if (!displayExperience.showNarrative || state !== "ok" || !insight) {
    if (
      displayExperience.showModelPrediction &&
      prediction?.type === "PREMATCH"
    ) {
      return (
        <MatchAnalyticsCard>
          <MatchCardHeader className="gap-1">
            <MatchCardTitle className="flex items-center gap-2">
              <SparklesIcon aria-hidden className="size-4" />
              AI engine
            </MatchCardTitle>
            {displayExperience.description ? (
              <p className="text-muted-foreground text-xs">
                {displayExperience.description}
              </p>
            ) : null}
          </MatchCardHeader>
          <MatchCardContent>
            <WinProbabilitiesBar
              probabilities={prediction.winProbabilities}
              winOutcome={prediction.predictedOutcome}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          </MatchCardContent>
        </MatchAnalyticsCard>
      );
    }

    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle className="flex items-center gap-2">
            <SparklesIcon aria-hidden className="size-4" />
            AI engine
          </MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          {displayExperience.headline ? (
            <AIEngineAnalysisNotice
              experience={displayExperience}
              className="border-0 bg-transparent py-4"
            />
          ) : (
            <MatchEmptyStateFromFixture
              id="aiEngine"
              fixture={fixture}
              icon={TrendingUpIcon}
            />
          )}
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const metrics = resolveInsightDisplayMetrics(insight, prediction);

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <MatchCardTitle className="flex items-center gap-2">
          <SparklesIcon aria-hidden className="size-4" />
          AI engine
        </MatchCardTitle>
      </MatchCardHeader>
      <MatchCardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge confidence={metrics.confidence} />
          {insightMode === "historical" ? (
            <Badge variant="outline">Pre-match</Badge>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed">{insight.summary}</p>
        <AnalysisDataCoverage
          coverage={insight.dataCoverage}
          dataUsedFallback={insight.dataUsed}
        />
        <p className="text-muted-foreground text-xs">
          {outcomeLabel(metrics.winOutcome, homeTeam, awayTeam)}
        </p>
        <WinProbabilitiesBar
          probabilities={metrics.winProbabilities}
          winOutcome={metrics.winOutcome}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}

export function OverviewAiEngineCard({
  fixture,
  renderMode,
  returnTo,
}: OverviewAiEngineCardProps) {
  const prematchInsight = usePrematchInsight();
  const deltaData = prematchInsight.liveDelta;
  const { aiUiState, aiUiCopy } = prematchInsight;

  if (prematchInsight.state === "guest") {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle className="flex items-center gap-2">
            <SparklesIcon aria-hidden className="size-4" />
            AI engine
          </MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Sign up free to unlock AI predictions and live model updates.
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`} />
            }
          >
            Sign up free
          </Button>
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  if (renderMode === "pre") {
    return <PreMatchAiEngineCard fixture={fixture} />;
  }

  const prematch = deltaData?.prematch ?? null;
  const live =
    deltaData?.liveAvailable === false ? null : (deltaData?.live ?? null);
  const liveInsight = prematchInsight.insight;

  const validatedLivePrediction =
    deltaData?.liveAvailable !== false && deltaData?.livePrediction
      ? {
          winProbabilities: deltaData.livePrediction.winProbabilities,
          predictedOutcome: deltaData.livePrediction.predictedOutcome,
          confidence: deltaData.livePrediction.confidence,
          expectedGoalsTotalMin: deltaData.livePrediction.expectedGoalsTotalMin,
          expectedGoalsTotalMax: deltaData.livePrediction.expectedGoalsTotalMax,
          expectedGoalsTotal: deltaData.livePrediction.expectedGoalsTotal,
          over2Prob: deltaData.livePrediction.over2Prob,
          over3Prob: deltaData.livePrediction.over3Prob,
          weakerTeamScoringProb: deltaData.livePrediction.weakerTeamScoringProb,
        }
      : null;

  const liveMetrics =
    liveInsight && validatedLivePrediction
      ? resolveInsightDisplayMetrics(liveInsight, validatedLivePrediction)
      : null;

  const hasLiveNarrative =
    renderMode === "live" &&
    prematchInsight.insightMode === "live" &&
    liveInsight != null;

  if (!prematch && !live && deltaData == null && aiUiState === "AI_LOADING") {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>AI engine</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <Skeleton className="h-20 w-full" />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  if (!prematch && !live) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>AI engine</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          {aiUiCopy.description ? (
            <p className="text-muted-foreground text-sm">
              {aiUiCopy.description}
            </p>
          ) : (
            <MatchEmptyStateFromFixture
              id="aiEngine"
              fixture={fixture}
              icon={TrendingUpIcon}
            />
          )}
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-1">
        <MatchCardTitle className="flex items-center gap-2">
          <SparklesIcon aria-hidden className="size-4" />
          AI engine
        </MatchCardTitle>
        {renderMode === "finished" ? (
          <p className="text-muted-foreground text-xs">
            Historical pre-kickoff model vs any live updates during the match.
          </p>
        ) : renderMode === "live" && !hasLiveNarrative ? (
          <p className="text-muted-foreground text-xs">
            Pre-match analysis and live probabilities — full live commentary on
            the AI Engine tab.
          </p>
        ) : deltaData?.liveMinute != null ? (
          <p className="text-muted-foreground text-xs">
            Live model updated at {deltaData.liveMinute}&apos;
          </p>
        ) : null}
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        {renderMode === "live" &&
        deltaData?.liveAvailable === false &&
        aiUiCopy.description ? (
          <p className="text-muted-foreground text-sm">
            {aiUiCopy.description}
          </p>
        ) : null}
        {renderMode === "live" && liveInsight && liveMetrics ? (
          <div className="border-border/60 space-y-3 border-b pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <ConfidenceBadge confidence={liveMetrics.confidence} />
              <Badge variant="outline">Live insight</Badge>
            </div>
            <p className="text-sm leading-relaxed">{liveInsight.summary}</p>
            <AnalysisDataCoverage
              coverage={liveInsight.dataCoverage}
              dataUsedFallback={liveInsight.dataUsed}
            />
            <WinProbabilitiesBar
              probabilities={liveMetrics.winProbabilities}
              winOutcome={liveMetrics.winOutcome}
              homeTeam={fixture.homeTeam}
              awayTeam={fixture.awayTeam}
            />
          </div>
        ) : null}
        {renderProbabilityDelta(prematch, live)}
        {renderMode === "live" && !hasLiveNarrative && (prematch || live) ? (
          <Button
            size="sm"
            variant="secondary"
            nativeButton={false}
            render={<Link href={buildMatchHref(fixture.externalId, "ai")} />}
          >
            Open AI Engine
          </Button>
        ) : null}
        {renderMode === "finished" && deltaData?.prematchPrediction ? (
          <FinishedPredictionReview
            fixture={fixture}
            snapshot={deltaData.prematchPrediction}
            insightSummary={prematchInsight.insight?.summary ?? null}
            insightCreatedAt={prematchInsight.insight?.createdAt ?? null}
          />
        ) : null}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
