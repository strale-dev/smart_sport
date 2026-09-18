"use client";

import Link from "next/link";

import { LiveStatusChip } from "@/components/match/LiveStatusChip";
import { MatchFixtureScoreboard } from "@/components/match/MatchFixtureScoreboard";
import { MatchMetaBar } from "@/components/match/MatchMetaBar";
import { formatFixtureMinute } from "@/lib/fixtures/display";
import { isPresentationLiveFixture } from "@/lib/live/live-presentation";
import { formatRelativeTime } from "@/lib/ai/format";
import { isAiUpdatedMarkerFresh } from "@/lib/live/ai-updated-marker";
import { getMatchScoreboardPreset } from "@/lib/match/scoreboard-presets";
import { cn } from "@/lib/utils";
import type { Fixture } from "@/types/domain";

type MatchRowProps = {
  fixture: Fixture & { aiUpdatedAt?: string | null };
  className?: string;
  highlight?: boolean;
  showLeague?: boolean;
  anchorId?: string;
  todayDateKey?: string;
};

const rowScoreboardPreset = getMatchScoreboardPreset("row");

export function MatchRow({
  fixture,
  className,
  highlight = false,
  showLeague = true,
  anchorId,
  todayDateKey,
}: MatchRowProps) {
  const isLive = isPresentationLiveFixture(fixture);
  const minuteLabel = formatFixtureMinute(fixture);
  const showAiUpdated =
    fixture.aiUpdatedAt != null && isAiUpdatedMarkerFresh(fixture.aiUpdatedAt);

  return (
    <div
      className={cn(
        "glass-card border-border/80 ring-foreground/5 scroll-mt-24 overflow-hidden rounded-xl border py-0 ring-1",
        highlight && "border-primary/40 bg-card/60 ring-primary/10",
        className
      )}
    >
      {showLeague ? (
        <div className="px-3 pt-3">
          <MatchMetaBar
            density="row"
            leagueExternalId={fixture.league.externalId}
            leagueName={fixture.league.name}
            leagueLogoUrl={fixture.league.logoUrl}
            trailing={
              <>
                {showAiUpdated ? (
                  <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    AI updated {formatRelativeTime(fixture.aiUpdatedAt!)}
                  </span>
                ) : null}
                {isLive ? (
                  <LiveStatusChip minuteLabel={minuteLabel} animate />
                ) : null}
              </>
            }
          />
        </div>
      ) : null}

      <Link
        id={anchorId}
        href={`/matches/${fixture.externalId}`}
        className="hover:bg-muted/40 focus-visible:ring-ring/50 block rounded-xl px-3 py-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <MatchFixtureScoreboard
          fixture={fixture}
          {...rowScoreboardPreset}
          todayDateKey={todayDateKey}
        />
      </Link>
    </div>
  );
}
