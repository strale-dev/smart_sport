"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { TeamLogo } from "@/components/match/TeamLogo";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatFixtureKickoffTime,
  formatFixtureMinute,
  formatFixtureScore,
  isFinishedFixtureStatus,
  shouldShowFixtureScore,
} from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { LeagueLink } from "@/components/common/LeagueLink";

type FeaturedMatchHeroProps = {
  fixture: Fixture;
};

function featuredStatusLabel(fixture: Fixture, timeZone: string): string {
  if (isLiveFixtureStatus(fixture.status)) {
    return formatFixtureMinute(fixture) ?? "Live";
  }

  if (
    isFinishedFixtureStatus(fixture.status) ||
    shouldShowFixtureScore(fixture)
  ) {
    return "Full time";
  }

  return formatFixtureKickoffTime(fixture.kickoffAt, timeZone);
}

export function FeaturedMatchHero({ fixture }: FeaturedMatchHeroProps) {
  const timeZone = useViewerTimezone();
  const isLive = isLiveFixtureStatus(fixture.status);
  const showScore = shouldShowFixtureScore(fixture);

  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 w-full ring-1 backdrop-blur-sm">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Featured match</Badge>
          {isLive ? <LiveStatusChip appearance="compact" animate /> : null}
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <LeagueLink
            leagueExternalId={fixture.league.externalId}
            leagueName={`${fixture.league.name}${fixture.round ? ` · ${fixture.round}` : ""}`}
            leagueLogoUrl={fixture.league.logoUrl}
          />
          <span aria-hidden="true">·</span>
          <span>{featuredStatusLabel(fixture, timeZone)}</span>
        </CardDescription>
        <CardTitle className="font-heading text-xl sm:text-2xl">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamLogo
              name={fixture.homeTeam.name}
              logoUrl={fixture.homeTeam.logoUrl}
              className="size-12"
            />
            <span className="text-sm font-medium">{fixture.homeTeam.name}</span>
          </div>

          <div className="text-center">
            {showScore ? (
              <p className="font-mono text-4xl font-semibold tabular-nums">
                {formatFixtureScore(fixture, timeZone)}
              </p>
            ) : (
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatFixtureKickoffTime(fixture.kickoffAt, timeZone)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <TeamLogo
              name={fixture.awayTeam.name}
              logoUrl={fixture.awayTeam.logoUrl}
              className="size-12"
            />
            <span className="text-sm font-medium">{fixture.awayTeam.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">AI insights coming soon</Badge>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/matches/${fixture.externalId}`} />}
          >
            View match
            <ArrowRightIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
