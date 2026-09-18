import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { TeamLogo } from "@/components/match/TeamLogo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadLandingShowcaseFixture } from "@/lib/marketing/landing-showcase";
import { cn } from "@/lib/utils";

const OUTCOME_LABEL = {
  "1": "Home win lean",
  X: "Draw lean",
  "2": "Away win lean",
} as const;

export async function LandingProductShowcase({
  className,
}: {
  className?: string;
}) {
  const showcase = await loadLandingShowcaseFixture();

  if (!showcase) {
    return (
      <div className={cn("space-y-2", className)}>
        <Card className="border-border/80 bg-card/60 ring-foreground/5 shadow-lg ring-1 backdrop-blur-sm">
          <CardHeader className="gap-2">
            <Badge variant="outline">Live product</Badge>
            <CardTitle className="font-heading text-lg">
              Match intelligence preview
            </CardTitle>
            <CardDescription>
              Sync fixtures in your environment to preview a real upcoming match
              here — same UI as production.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { fixture, modelProbability, confidence, predictedOutcome } = showcase;
  const kickoffLabel = new Date(fixture.kickoffAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Card className="border-border/80 bg-card/60 ring-foreground/5 shadow-lg ring-1 backdrop-blur-sm">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Live product</Badge>
            {confidence ? <ConfidenceBadge confidence={confidence} /> : null}
            <DataQualityChip quality="COMPLETE" />
          </div>
          <CardTitle className="font-heading text-lg leading-snug">
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </CardTitle>
          <CardDescription>
            {fixture.league.name} · {kickoffLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <TeamLogo
                name={fixture.homeTeam.name}
                logoUrl={fixture.homeTeam.logoUrl}
                className="size-10"
              />
              <p className="text-muted-foreground max-w-[8rem] truncate text-xs">
                {fixture.homeTeam.name}
              </p>
            </div>
            <span className="text-muted-foreground font-mono text-sm">vs</span>
            <div className="flex flex-col items-center gap-1 text-center">
              <TeamLogo
                name={fixture.awayTeam.name}
                logoUrl={fixture.awayTeam.logoUrl}
                className="size-10"
              />
              <p className="text-muted-foreground max-w-[8rem] truncate text-xs">
                {fixture.awayTeam.name}
              </p>
            </div>
          </div>

          <div className="border-border space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Pre-match model snapshot</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {modelProbability != null && predictedOutcome ? (
                <>
                  {OUTCOME_LABEL[predictedOutcome]}. Model max outcome
                  probability{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {Math.round(modelProbability * 100)}%
                  </span>{" "}
                  — analytical estimate, not a betting tip.
                </>
              ) : (
                <>
                  Probabilities appear once the prediction engine has run for
                  this fixture. Sign up to unlock full AI analysis on match
                  pages.
                </>
              )}
            </p>
          </div>

          {modelProbability != null ? (
            <Badge variant="info" className="font-mono tabular-nums">
              Win prob. {Math.round(modelProbability * 100)}%
            </Badge>
          ) : null}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        Real fixture data from your synced database — same components as the
        in-app match experience.
      </p>
    </div>
  );
}
