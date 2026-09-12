"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { motion } from "motion/react";

import { AiUpdatedIndicator } from "@/components/ai/AiUpdatedIndicator";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { KeyFactorsList } from "@/components/ai/KeyFactorsList";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import {
  formatExpectedGoalsRange,
  formatWinProbability,
  outcomeLabel,
} from "@/lib/ai/format";
import type { StoredAIInsight } from "@/lib/ai/schemas";
import type { PrematchInsightMode } from "@/lib/ai/schemas";
import { motionTransition, usePrefersReducedMotion } from "@/lib/motion";
import type { TeamRef } from "@/types/domain";
import { AI_DISCLAIMER } from "@/lib/marketing/copy";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIHeroCardProps = {
  insight: StoredAIInsight;
  insightMode: PrematchInsightMode;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
};

export function AIHeroCard({
  insight,
  insightMode,
  homeTeam,
  awayTeam,
}: AIHeroCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Card className="border-primary/20 from-card/90 to-card/60 ring-primary/10 min-h-[min(28vh,14rem)] w-full bg-gradient-to-br ring-1">
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
          <ConfidenceBadge confidence={insight.confidence} />
          <DataQualityChip quality={insight.dataQuality} />
          <AiUpdatedIndicator
            createdAt={insight.createdAt}
            insightMode={insightMode}
            insightId={insight.id}
          />
        </div>
        <motion.div
          key={insight.id}
          initial={prefersReducedMotion ? false : { opacity: 0.45 }}
          animate={{ opacity: 1 }}
          transition={motionTransition(prefersReducedMotion, { duration: 0.3 })}
        >
          <CardDescription className="text-foreground/90 max-w-3xl text-base">
            {insight.summary}
          </CardDescription>
          <p className="text-muted-foreground mt-2 text-xs">
            {outcomeLabel(insight.winOutcome, homeTeam, awayTeam)}
          </p>
        </motion.div>
      </CardHeader>

      <CardContent className="space-y-5">
        <motion.div
          key={`${insight.id}-probs`}
          initial={prefersReducedMotion ? false : { opacity: 0.45 }}
          animate={{ opacity: 1 }}
          transition={motionTransition(prefersReducedMotion, { duration: 0.3 })}
        >
          <WinProbabilitiesBar
            probabilities={insight.winProbabilities}
            winOutcome={insight.winOutcome}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </motion.div>

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
          <motion.div
            key={`${insight.id}-factors`}
            initial={prefersReducedMotion ? false : { opacity: 0.45 }}
            animate={{ opacity: 1 }}
            transition={motionTransition(prefersReducedMotion, {
              duration: 0.3,
            })}
          >
            <KeyFactorsList factors={insight.keyFactors} limit={3} />
          </motion.div>
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
