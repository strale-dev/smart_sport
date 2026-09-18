import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { AiDisclaimerText } from "@/components/common/AiDisclaimerText";
import { TeamLogo } from "@/components/match/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TopPick } from "@/lib/predictions/top-picks";
import { cn } from "@/lib/utils";

const OUTCOME_LABEL: Record<TopPick["predictedOutcome"], string> = {
  "1": "Home win",
  X: "Draw",
  "2": "Away win",
};

type PredictionsPickCardProps = {
  pick: TopPick;
  rank: number;
  className?: string;
};

export function PredictionsPickCard({
  pick,
  rank,
  className,
}: PredictionsPickCardProps) {
  const probabilityPercent = Math.round(pick.modelProbability * 100);

  return (
    <Card className={cn("border-border/80 w-full", className)}>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className="font-mono tabular-nums">
            #{rank}
          </Badge>
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={pick.confidence} />
            <DataQualityChip quality={pick.dataQuality} />
          </div>
        </div>
        <CardTitle className="font-heading text-lg leading-snug">
          {pick.homeTeamName} vs {pick.awayTeamName}
        </CardTitle>
        <CardDescription>
          {pick.leagueName} ·{" "}
          {new Date(pick.kickoffAt).toLocaleString(undefined, {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
            timeZoneName: "short",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo
              name={pick.homeTeamName}
              logoUrl={null}
              className="size-7"
            />
            <span className="truncate text-sm font-medium">
              {pick.homeTeamName}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">vs</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {pick.awayTeamName}
            </span>
            <TeamLogo
              name={pick.awayTeamName}
              logoUrl={null}
              className="size-7"
            />
          </div>
        </div>
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2">
          <div>
            <p className="text-muted-foreground text-xs">Predicted outcome</p>
            <p className="font-medium">
              {OUTCOME_LABEL[pick.predictedOutcome]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Model probability</p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {probabilityPercent}%
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {pick.keyFactors.map((factor) => (
            <li key={factor.label} className="text-sm">
              <span className="font-medium">{factor.label}</span>
              {factor.evidence ? (
                <span className="text-muted-foreground">
                  {" "}
                  — {factor.evidence}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-4">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={pick.analysisHref} />}
        >
          View analysis
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Button>
        <AiDisclaimerText />
      </CardFooter>
    </Card>
  );
}
