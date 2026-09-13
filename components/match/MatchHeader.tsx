"use client";

import { MapPinIcon } from "lucide-react";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { MatchFixtureScoreboard } from "@/components/match/MatchFixtureScoreboard";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { LeagueLink } from "@/components/common/LeagueLink";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
} from "@/components/match/MatchAnalyticsCard";
import {
  formatFixtureMinute,
  formatMatchHeaderStatusLabel,
} from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

type MatchHeaderProps = {
  fixture: Fixture;
};

function formatVenue(fixture: Fixture): string | null {
  if (!fixture.venue?.name) {
    return null;
  }

  if (fixture.venue.city) {
    return `${fixture.venue.name}, ${fixture.venue.city}`;
  }

  return fixture.venue.name;
}

export function MatchHeader({ fixture: fixtureProp }: MatchHeaderProps) {
  const liveContext = useMatchLiveContext();
  const fixture = liveContext?.fixture ?? fixtureProp;
  const timeZone = useViewerTimezone();
  const isLive = isLiveFixtureStatus(fixture.status);
  const venueLabel = formatVenue(fixture);
  const statusLabel = formatMatchHeaderStatusLabel(fixture, timeZone);
  const leagueLabel = `${fixture.league.name}${fixture.round ? ` · ${fixture.round}` : ""}`;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LeagueLink
            leagueExternalId={fixture.league.externalId}
            leagueName={leagueLabel}
            leagueLogoUrl={fixture.league.logoUrl}
            className="min-w-0 text-sm"
          />
          <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-sm">
            {isLive ? (
              <LiveStatusChip
                minuteLabel={formatFixtureMinute(fixture)}
                animate
              />
            ) : (
              statusLabel
            )}
          </span>
        </div>
      </MatchCardHeader>

      <MatchCardContent className="space-y-3">
        <h1 className="sr-only">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </h1>

        <MatchFixtureScoreboard
          fixture={fixture}
          linkTeams
          showHalftimeLine
          animateScore
          scoreClassName="text-2xl sm:text-4xl"
        />

        {venueLabel ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {venueLabel}
            </span>
          </div>
        ) : null}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
