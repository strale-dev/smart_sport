import Link from "next/link";

import { LiveDot } from "@/components/common/LiveDot";
import { TeamLogo } from "@/components/match/TeamLogo";
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
};

export function MatchRow({
  fixture,
  className,
  highlight = false,
}: MatchRowProps) {
  const isLive = isLiveFixtureStatus(fixture.status);
  const isFinished = isFinishedFixtureStatus(fixture.status);
  const minuteLabel = formatFixtureMinute(fixture);
  const showScore = isLive || isFinished;

  return (
    <Link
      href={`/matches/${fixture.externalId}`}
      className={cn(
        "border-border/70 hover:bg-muted/40 focus-visible:ring-ring/50 block rounded-xl border px-3 py-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
        highlight && "border-primary/40 bg-card/60 ring-primary/10 ring-1",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {fixture.league.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.league.logoUrl}
              alt=""
              className="size-4 shrink-0 object-contain"
              loading="lazy"
            />
          ) : null}
          <span className="text-muted-foreground truncate text-xs">
            {fixture.league.name}
          </span>
        </div>
        {isLive ? <LiveDot className="shrink-0" /> : null}
      </div>

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
              <p className="font-mono text-lg font-semibold tabular-nums">
                {formatFixtureScore(fixture)}
              </p>
              {minuteLabel ? (
                <Badge variant="live" className="font-mono tabular-nums">
                  {minuteLabel}
                </Badge>
              ) : null}
            </div>
          ) : (
            <Badge variant="outline" className="font-mono tabular-nums">
              {formatFixtureScore(fixture)}
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
  );
}
