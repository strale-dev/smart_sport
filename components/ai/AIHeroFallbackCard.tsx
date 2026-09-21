"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { AIHeroMotionSection } from "@/components/ai/AIHeroMotionSection";
import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { formatWinProbability } from "@/lib/ai/format";
import type { PrematchPredictionResult } from "@/types/prediction";
import type { TeamRef } from "@/types/domain";

import { AIHeroShell } from "@/components/ai/AIHeroShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_DISCLAIMER } from "@/lib/marketing/copy";

type AIHeroFallbackCardProps = {
  prediction: PrematchPredictionResult;
  message?: string | null;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  onRetry?: () => void;
  isRetrying?: boolean;
  mode?: "error" | "generating";
};

export function AIHeroFallbackCard({
  prediction,
  message,
  homeTeam,
  awayTeam,
  onRetry,
  isRetrying = false,
  mode = "error",
}: AIHeroFallbackCardProps) {
  const confidence = prediction.confidence;
  const motionKey = prediction.predictionId;

  return (
    <AIHeroShell variant="plain">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            Model probabilities
          </CardTitle>
          {mode === "error" ? (
            <Badge variant="outline">Analysis temporarily unavailable</Badge>
          ) : (
            <Badge variant="outline">Preparing analysis</Badge>
          )}
          <ConfidenceBadge confidence={confidence} />
          {mode === "error" ? (
            <DataQualityChip quality={prediction.inputSnapshot.dataQuality} />
          ) : null}
        </div>
        <AIHeroMotionSection motionKey={`${motionKey}-message`}>
          <CardDescription>
            {message ??
              (mode === "generating"
                ? "Building the shared pre-match analysis. Model probabilities are already available below."
                : "The narrative analysis is temporarily unavailable. Model probabilities are shown below.")}
          </CardDescription>
        </AIHeroMotionSection>
      </CardHeader>
      <CardContent className="space-y-4">
        <AIHeroMotionSection motionKey={`${motionKey}-probs`}>
          <WinProbabilitiesBar
            probabilities={prediction.winProbabilities}
            winOutcome={prediction.predictedOutcome}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </AIHeroMotionSection>
        <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Expected goals: {prediction.expectedGoalsHome.toFixed(1)} –{" "}
            {prediction.expectedGoalsAway.toFixed(1)}
          </p>
          <p>BTTS: {formatWinProbability(prediction.bttsProb)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 border-t pt-4">
        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying ? "Generating…" : "Retry AI analysis"}
          </Button>
        ) : null}
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
