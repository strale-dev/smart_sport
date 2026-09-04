import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { TeamLogo } from "@/components/match/TeamLogo";
import { PlayerContributionBadges } from "@/components/player/PlayerContributionBadges";
import { PlayerMatchesPagination } from "@/components/player/PlayerMatchesPagination";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { cn } from "@/lib/utils";
import type { PlayerMatchHistoryPage } from "@/types/domain";

type PlayerMatchesTabProps = {
  playerId: number;
  history: PlayerMatchHistoryPage;
};

export function PlayerMatchesTab({ playerId, history }: PlayerMatchesTabProps) {
  if (history.items.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="No matches yet"
        description="Match appearances will appear once the provider publishes player performance data."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {history.items.map((appearance) => {
          const finished = isFinishedFixtureStatus(appearance.status);
          const scoreLabel = finished
            ? formatFixtureScore({
                home: appearance.homeScore,
                away: appearance.awayScore,
              })
            : "—";
          const minutesLabel =
            appearance.minutes != null ? `${appearance.minutes}'` : "—";
          const ratingLabel =
            appearance.rating != null ? appearance.rating.toFixed(1) : "—";

          return (
            <Link
              key={appearance.fixtureExternalId}
              href={`/matches/${appearance.fixtureExternalId}`}
              className={cn(
                "border-border/70 hover:bg-muted/40 focus-visible:ring-ring/50 block rounded-xl border p-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
              )}
            >
              <div className="text-muted-foreground mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  {appearance.leagueLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={appearance.leagueLogoUrl}
                      alt=""
                      className="size-4 shrink-0 object-contain"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="truncate">{appearance.leagueName}</span>
                </span>
                <time dateTime={appearance.kickoffAt} className="shrink-0">
                  {new Date(appearance.kickoffAt).toLocaleDateString(
                    undefined,
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )}
                </time>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <TeamLogo
                    name={appearance.opponent.name}
                    logoUrl={appearance.opponent.logoUrl}
                    className="size-6"
                  />
                  <span className="truncate text-sm font-medium">
                    {appearance.isHome ? "vs" : "@"} {appearance.opponent.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {scoreLabel}
                  </span>
                  <span className="text-muted-foreground w-10 font-mono text-xs tabular-nums">
                    {minutesLabel}
                  </span>
                  <span className="text-muted-foreground w-8 font-mono text-xs tabular-nums">
                    {ratingLabel}
                  </span>
                </div>
              </div>

              {appearance.badges.length > 0 ? (
                <div className="mt-2">
                  <PlayerContributionBadges badges={appearance.badges} />
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>

      <PlayerMatchesPagination
        playerId={playerId}
        page={history.page}
        totalPages={history.totalPages}
      />
    </div>
  );
}

function formatFixtureScore(score: {
  home: number | null;
  away: number | null;
}): string {
  if (score.home == null || score.away == null) {
    return "—";
  }

  return `${score.home}–${score.away}`;
}
