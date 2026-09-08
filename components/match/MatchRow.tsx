"use client";

import Link from "next/link";

import { LiveDot } from "@/components/common/LiveDot";
import { LeagueLink } from "@/components/common/LeagueLink";
import { TeamLogo } from "@/components/match/TeamLogo";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Badge } from "@/components/ui/badge";
import {
  formatFixtureMinute,
  formatFixtureScore,
  isFinishedFixtureStatus,
} from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { cn } from "@/lib/utils";
import type { Fixture } from "@/types/domain";

type MatchRowProps = {
  fixture: Fixture;
  className?: string;
  highlight?: boolean;
  showLeague?: boolean;
  anchorId?: string;
};

export function MatchRow({
  fixture,
  className,
  highlight = false,
  showLeague = true,
  anchorId,
}: MatchRowProps) {
  const timeZone = useViewerTimezone();
  const isLive = isLiveFixtureStatus(fixture.status);
  const isFinished = isFinishedFixtureStatus(fixture.status);
  const minuteLabel = formatFixtureMinute(fixture);
  const showScore = isLive || isFinished;

  return (
    <div
      className={cn(
        "border-border/70 scroll-mt-24 rounded-xl border",
        highlight && "border-primary/40 bg-card/60 ring-primary/10 ring-1",
        className
      )}
    >
      {showLeague ? (
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <LeagueLink
            leagueExternalId={fixture.league.externalId}
            leagueName={fixture.league.name}
            leagueLogoUrl={fixture.league.logoUrl}
            className="text-muted-foreground text-xs"
          />
          {isLive ? <LiveDot className="shrink-0" /> : null}
        </div>
      ) : null}

      <Link
        id={anchorId}
        href={`/matches/${fixture.externalId}`}
        className="hover:bg-muted/40 focus-visible:ring-ring/50 block rounded-xl px-3 py-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <TeamLogo
              name={fixture.homeTeam.name}
              logoUrl={fixture.homeTeam.logoUrl}
            />
            <span className="truncate text-sm font-medium">
              {fixture.homeTeam.name}
            </span>
          </div>

          <div className="text-center">
            {showScore ? (
              <div className="space-y-0.5">
                <p
                  className={cn(
                    "font-mono text-lg font-semibold tabular-nums",
                    isLive && "text-live"
                  )}
                >
                  {formatFixtureScore(fixture, timeZone)}
                </p>
                {minuteLabel ? (
                  <Badge variant="live" className="font-mono tabular-nums">
                    {minuteLabel}
                  </Badge>
                ) : null}
              </div>
            ) : (
              <Badge variant="outline" className="font-mono tabular-nums">
                {formatFixtureScore(fixture, timeZone)}
              </Badge>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-medium">
              {fixture.awayTeam.name}
            </span>
            <TeamLogo
              name={fixture.awayTeam.name}
              logoUrl={fixture.awayTeam.logoUrl}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
