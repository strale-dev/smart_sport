import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";
import { formatWinProbability } from "@/lib/ai/format";
import type { PrematchPredictionResult } from "@/types/prediction";
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
import { AI_DISCLAIMER } from "@/lib/marketing/copy";

type AIHeroFallbackCardProps = {
  prediction: PrematchPredictionResult;
  message?: string | null;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
};

export function AIHeroFallbackCard({
  prediction,
  message,
  homeTeam,
  awayTeam,
}: AIHeroFallbackCardProps) {
  const confidence = prediction.confidence;

  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 w-full ring-1">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            Model probabilities
          </CardTitle>
          <Badge variant="outline">Analysis temporarily unavailable</Badge>
          <ConfidenceBadge confidence={confidence} />
          <DataQualityChip quality={prediction.inputSnapshot.dataQuality} />
        </div>
        <CardDescription>
          {message ??
            "The narrative analysis is temporarily unavailable. Model probabilities are shown below."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <WinProbabilitiesBar
          probabilities={prediction.winProbabilities}
          winOutcome={prediction.predictedOutcome}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
        <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Expected goals: {prediction.expectedGoalsHome.toFixed(1)} –{" "}
            {prediction.expectedGoalsAway.toFixed(1)}
          </p>
          <p>BTTS: {formatWinProbability(prediction.bttsProb)}</p>
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
