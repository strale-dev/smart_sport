"use client";

import { MapPinIcon } from "lucide-react";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { MatchFixtureScoreboard } from "@/components/match/MatchFixtureScoreboard";
import { MatchMetaBar } from "@/components/match/MatchMetaBar";
import {
  MatchHeaderShell,
  MatchHeaderShellContent,
  MatchHeaderShellHeader,
} from "@/components/match/MatchHeaderShell";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import {
  formatFixtureMinute,
  formatMatchHeaderStatusLabel,
} from "@/lib/fixtures/display";
import { getMatchScoreboardPreset } from "@/lib/match/scoreboard-presets";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { ReactNode } from "react";

import type { Fixture } from "@/types/domain";

type MatchHeaderProps = {
  fixture: Fixture;
  favoriteControl?: ReactNode;
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

const headerScoreboardPreset = getMatchScoreboardPreset("header");

export function MatchHeader({
  fixture: fixtureProp,
  favoriteControl,
}: MatchHeaderProps) {
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
        <MatchMetaBar
          density="header"
          leagueExternalId={fixture.league.externalId}
          leagueName={leagueLabel}
          leagueLogoUrl={fixture.league.logoUrl}
          leagueLogoPriority
          trailing={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {favoriteControl}
              {isLive ? (
                <LiveStatusChip
                  minuteLabel={
                    liveContext?.displayMinuteLabel ??
                    formatFixtureMinute(fixture)
                  }
                  animate
                />
              ) : (
                <span className="text-muted-foreground text-sm">
                  {statusLabel}
                </span>
              )}
            </div>
          }
        />
      </MatchHeaderShellHeader>

      <MatchHeaderShellContent>
        <h1 className="sr-only">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </h1>

        <MatchFixtureScoreboard fixture={fixture} {...headerScoreboardPreset} />

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
