import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { LeagueLink } from "@/components/common/LeagueLink";
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
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
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
            <div
              key={appearance.fixtureExternalId}
              className="border-border/70 rounded-xl border"
            >
              <div className="flex items-center justify-between gap-3 px-3 pt-3">
                <LeagueLink
                  leagueExternalId={appearance.leagueExternalId}
                  leagueName={appearance.leagueName}
                  leagueLogoUrl={appearance.leagueLogoUrl}
                  className="text-muted-foreground min-w-0 text-xs"
                />
                <time
                  dateTime={appearance.kickoffAt}
                  className="text-muted-foreground shrink-0 text-xs"
                >
                  {new Date(appearance.kickoffAt).toLocaleDateString(
                    undefined,
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )}
                </time>
              </div>

              <Link
                href={`/matches/${appearance.fixtureExternalId}`}
                className={cn(
                  "hover:bg-muted/40 focus-visible:ring-ring/50 block rounded-xl p-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                )}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo
                      name={appearance.opponent.name}
                      logoUrl={appearance.opponent.logoUrl}
                      className="size-6"
                    />
                    <span className="truncate text-sm font-medium">
                      {appearance.isHome ? "vs" : "@"}{" "}
                      {appearance.opponent.name}
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
            </div>
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
