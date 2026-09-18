import { ConfidenceBadge } from "@/components/ai/ConfidenceBadge";
import { LiveDot } from "@/components/common/LiveDot";
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

export async function ProductScreensSection({
  className,
}: {
  className?: string;
}) {
  const showcase = await loadLandingShowcaseFixture();
  const fixture = showcase?.fixture;

  return (
    <section
      className={cn("scroll-mt-20 space-y-8", className)}
      aria-labelledby="product-screens-heading"
    >
      <div className="space-y-2 text-center">
        <h2
          id="product-screens-heading"
          className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Built for match day
        </h2>
        <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
          The same dark UI you get in the app — live center, AI hero, and ranked
          predictions without bookmaker odds.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/80 bg-card/50 lg:col-span-2">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="font-heading text-base">
              Match AI hero
            </CardTitle>
            <CardDescription>
              Structured probabilities, confidence, and explanations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixture ? (
              <>
                <p className="font-heading text-sm font-medium">
                  {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                </p>
                {showcase?.confidence ? (
                  <ConfidenceBadge confidence={showcase.confidence} />
                ) : null}
                <p className="text-muted-foreground text-sm">
                  Key factors and scenarios update when meaningful data changes
                  — never invented stats.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Connect fixtures to preview a real match card in the hero above.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/50">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="font-heading text-base">
              Live Center
            </CardTitle>
            <CardDescription>Relevance-first live list.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo
                name={fixture?.homeTeam.name ?? "Home"}
                logoUrl={fixture?.homeTeam.logoUrl ?? null}
                className="size-7"
              />
              <span className="truncate text-sm">Live match row</span>
            </div>
            <div className="flex items-center gap-2">
              <LiveDot />
              <Badge variant="outline" className="font-mono text-xs">
                1–0
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/50 lg:col-span-3">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="font-heading text-base">
              Predictions Center
            </CardTitle>
            <CardDescription>
              Top picks ranked by probability × confidence × data quality.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-muted-foreground text-xs">#1 pick</p>
              <p className="text-sm font-medium">
                {fixture
                  ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`
                  : "High-confidence fixture"}
              </p>
              {showcase?.modelProbability != null ? (
                <p className="font-mono text-lg tabular-nums">
                  {Math.round(showcase.modelProbability * 100)}%
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Model probabilities when predictions are synced.
                </p>
              )}
            </div>
            <div className="text-muted-foreground flex flex-col justify-center text-sm">
              No odds. No bookmakers. Transparent thresholds documented on{" "}
              <span className="text-foreground">/methodology</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
