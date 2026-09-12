"use client";

import Link from "next/link";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { AnimatedScore } from "@/components/match/AnimatedScore";
import { LeagueLink } from "@/components/common/LeagueLink";
import { TeamLogo } from "@/components/match/TeamLogo";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Badge } from "@/components/ui/badge";
import {
  formatFixtureMinute,
  formatFixtureScore,
  isFinishedFixtureStatus,
} from "@/lib/fixtures/display";
import { formatRelativeTime } from "@/lib/ai/format";
import { isAiUpdatedMarkerFresh } from "@/lib/live/ai-updated-marker";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { cn } from "@/lib/utils";
import type { Fixture } from "@/types/domain";

type MatchRowProps = {
  fixture: Fixture & { aiUpdatedAt?: string | null };
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
  const showAiUpdated =
    fixture.aiUpdatedAt != null && isAiUpdatedMarkerFresh(fixture.aiUpdatedAt);

  return (
    <div
      className={cn(
        "border-border/70 scroll-mt-24 rounded-xl border",
        highlight && "border-primary/40 bg-card/60 ring-primary/10 ring-1",
        className
      )}
    >
      {showLeague ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
          <LeagueLink
            leagueExternalId={fixture.league.externalId}
            leagueName={fixture.league.name}
            leagueLogoUrl={fixture.league.logoUrl}
            className="text-muted-foreground text-xs"
          />
          <div className="flex items-center gap-2">
            {showAiUpdated ? (
              <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                AI updated {formatRelativeTime(fixture.aiUpdatedAt!)}
              </span>
            ) : null}
            {isLive ? (
              <LiveStatusChip minuteLabel={minuteLabel} animate />
            ) : null}
          </div>
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
                <AnimatedScore
                  score={formatFixtureScore(fixture, timeZone)}
                  isLive={isLive}
                  className="text-lg"
                  animate={isLive}
                />
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
