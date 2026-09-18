import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { PredictionsPickCard } from "@/components/predictions/PredictionsPickCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginHref } from "@/lib/auth/return-to";
import type { TopPick } from "@/lib/predictions/top-picks";
import { cn } from "@/lib/utils";

const PLACEHOLDER_PICKS: TopPick[] = [
  {
    fixtureExternalId: 0,
    fixtureUuid: "placeholder-1",
    kickoffAt: new Date().toISOString(),
    homeTeamName: "Home Club",
    awayTeamName: "Away United",
    leagueName: "Demo League",
    predictedOutcome: "1",
    modelProbability: 0.62,
    confidence: "HIGH",
    dataQuality: "COMPLETE",
    rankScore: 0.62,
    keyFactors: [
      { label: "Form edge", evidence: "Recent results favor the home side." },
      { label: "Elo gap", evidence: "Strength ratings align with the pick." },
    ],
    matchHref: "/signup",
    analysisHref: "/signup",
  },
  {
    fixtureExternalId: 0,
    fixtureUuid: "placeholder-2",
    kickoffAt: new Date().toISOString(),
    homeTeamName: "Riverside FC",
    awayTeamName: "Northfield City",
    leagueName: "Demo League",
    predictedOutcome: "X",
    modelProbability: 0.58,
    confidence: "MEDIUM",
    dataQuality: "COMPLETE",
    rankScore: 0.49,
    keyFactors: [
      { label: "Balanced xG", evidence: "Expected goals are closely matched." },
      { label: "H2H", evidence: "Recent meetings were tight." },
    ],
    matchHref: "/signup",
    analysisHref: "/signup",
  },
];

type PredictionsCenterLockedProps = {
  returnTo: string;
  className?: string;
};

export function PredictionsCenterLocked({
  returnTo,
  className,
}: PredictionsCenterLockedProps) {
  const signupHref = `/signup?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none space-y-4 opacity-40 blur-sm select-none"
      >
        {PLACEHOLDER_PICKS.map((pick, index) => (
          <PredictionsPickCard
            key={pick.fixtureUuid}
            pick={pick}
            rank={index + 1}
          />
        ))}
      </div>

      <div className="bg-background/85 absolute inset-0 backdrop-blur-[2px]" />

      <Card className="border-primary/20 relative z-10 mx-auto mt-8 w-full max-w-lg shadow-lg">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <SparklesIcon
              aria-hidden="true"
              className="text-primary size-5 shrink-0"
            />
            <CardTitle className="font-heading text-xl">
              Top 10 high-confidence picks
            </CardTitle>
          </div>
          <CardDescription className="max-w-md">
            Sign up free to unlock today&apos;s ranked predictions, model
            probabilities, and key factors — no betting odds, just football
            intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href={signupHref} />}>
            Sign up free to unlock predictions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={loginHref(returnTo)} />}
          >
            Log in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
