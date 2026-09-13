"use client";

import { MapPinIcon } from "lucide-react";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { MatchFixtureScoreboard } from "@/components/match/MatchFixtureScoreboard";
import {
  MatchHeaderShell,
  MatchHeaderShellContent,
  MatchHeaderShellHeader,
} from "@/components/match/MatchHeaderShell";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { LeagueLink } from "@/components/common/LeagueLink";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
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
    <MatchHeaderShell>
      <MatchHeaderShellHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LeagueLink
            leagueExternalId={fixture.league.externalId}
            leagueName={leagueLabel}
            leagueLogoUrl={fixture.league.logoUrl}
            className="min-w-0 text-sm sm:text-base"
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
      </MatchHeaderShellHeader>

      <MatchHeaderShellContent>
        <h1 className="sr-only">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </h1>

        <MatchFixtureScoreboard
          fixture={fixture}
          linkTeams
          showHalftimeLine
          animateScore
          truncateTeamNames={false}
          scoreClassName="text-2xl sm:text-4xl"
          scheduledKickoffClassName="px-3 py-1.5 text-base sm:px-3.5 sm:py-2 sm:text-lg"
          logoClassName="size-10 sm:size-16"
          teamNameClassName="text-sm font-semibold sm:text-xl md:text-2xl"
          teamLinkClassName="hover:bg-muted/40 focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-xl p-1.5 transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:gap-2.5 sm:p-2"
          className="max-w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 sm:gap-4"
          centerColumnClassName="shrink-0 px-1 sm:px-2"
        />

        {venueLabel ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {venueLabel}
            </span>
          </div>
        ) : null}
      </MatchHeaderShellContent>
    </MatchHeaderShell>
  );
}
