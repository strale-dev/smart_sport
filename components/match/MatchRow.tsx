"use client";

import Link from "next/link";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { MatchFixtureScoreboard } from "@/components/match/MatchFixtureScoreboard";
import { LeagueLink } from "@/components/common/LeagueLink";
import { formatFixtureMinute } from "@/lib/fixtures/display";
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
  const isLive = isLiveFixtureStatus(fixture.status);
  const minuteLabel = formatFixtureMinute(fixture);
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
        <MatchFixtureScoreboard fixture={fixture} linkTeams={false} />
      </Link>
    </div>
  );
}
