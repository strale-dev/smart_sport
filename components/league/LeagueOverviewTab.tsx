import Link from "next/link";
import { CalendarDaysIcon, TrophyIcon, UsersIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildFixturesHref } from "@/lib/fixtures/url";
import { buildLeagueHref } from "@/lib/leagues/url";
import { findLeagueSeason } from "@/lib/leagues/season";
import { selectRelevantStandingsGroup } from "@/lib/standings/select-relevant-group";
import type {
  Fixture,
  League,
  LeaguePlayerLeaderboardRow,
  Season,
  StandingsGroup,
} from "@/types/domain";

type LeagueOverviewTabProps = {
  league: League;
  seasons: Season[];
  seasonYear: number | null;
  standings: StandingsGroup[];
  topScorers: LeaguePlayerLeaderboardRow[];
  fixtures: Fixture[];
};

function formatSeasonDates(season: Season | null): string | null {
  if (!season?.startDate && !season?.endDate) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const start = season.startDate
    ? formatter.format(new Date(season.startDate))
    : null;
  const end = season.endDate
    ? formatter.format(new Date(season.endDate))
    : null;

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start ?? end;
}

export function LeagueOverviewTab({
  league,
  seasons,
  seasonYear,
  standings,
  topScorers,
  fixtures,
}: LeagueOverviewTabProps) {
  const season = findLeagueSeason(seasons, seasonYear);
  const seasonDates = formatSeasonDates(season);
  const primaryGroup = selectRelevantStandingsGroup(standings, 0, 0);
  const topRows = primaryGroup?.rows.slice(0, 5) ?? [];
  const previewScorers = topScorers.slice(0, 3);
  const upcomingFixtures = fixtures
    .filter((fixture) => fixture.status === "NS" || fixture.status === "TBD")
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="gap-2">
          <CardTitle className="font-heading text-base">
            Season overview
          </CardTitle>
          <CardDescription>
            {seasonYear ?? "Season"}
            {seasonDates ? ` · ${seasonDates}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={buildLeagueHref(league.externalId, {
                  tab: "standings",
                  season: seasonYear,
                })}
              />
            }
          >
            Standings
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={buildLeagueHref(league.externalId, {
                  tab: "fixtures",
                  season: seasonYear,
                })}
              />
            }
          >
            Fixtures
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={buildLeagueHref(league.externalId, {
                  tab: "top-stats",
                  season: seasonYear,
                })}
              />
            }
          >
            Top stats
          </Button>
        </CardContent>
      </Card>

      {topRows.length > 0 ? (
        <Card className="w-full">
          <CardHeader className="gap-2">
            <CardTitle className="font-heading text-base">
              Top of the table
            </CardTitle>
            <CardDescription>Current top five</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="pr-3 pb-2 font-medium">#</th>
                  <th className="pr-3 pb-2 font-medium">Team</th>
                  <th className="pr-3 pb-2 font-medium">P</th>
                  <th className="pb-2 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr
                    key={row.team.externalId}
                    className="border-b last:border-0"
                  >
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {row.rank}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/teams/${row.team.externalId}`}
                        className="hover:text-foreground font-medium transition-colors"
                      >
                        {row.team.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {row.played ?? "–"}
                    </td>
                    <td className="py-2 font-mono tabular-nums">
                      {row.points ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardContent className="pt-6">
            <EmptyState
              icon={TrophyIcon}
              title="Standings preview unavailable"
              description="Open the Standings tab once table data is available."
              actions={[
                {
                  label: "Open Standings tab",
                  href: buildLeagueHref(league.externalId, {
                    tab: "standings",
                  }),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {previewScorers.length > 0 ? (
        <Card className="w-full">
          <CardHeader className="gap-2">
            <CardTitle className="font-heading text-base">
              Top scorers
            </CardTitle>
            <CardDescription>Leading goal scorers this season</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewScorers.map((row) => (
              <div
                key={row.player.externalId}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-muted-foreground w-5 font-mono text-sm tabular-nums">
                    {row.rank}
                  </span>
                  <Link
                    href={`/players/${row.player.externalId}`}
                    className="truncate font-medium transition-colors hover:underline"
                  >
                    {row.player.fullName}
                  </Link>
                  <span className="text-muted-foreground truncate text-sm">
                    {row.team.name}
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {row.goals ?? 0}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardContent className="pt-6">
            <EmptyState
              icon={UsersIcon}
              title="Top scorers unavailable"
              description="Goal scoring leaders will appear once provider data is available."
              actions={[
                {
                  label: "Open Top stats tab",
                  href: buildLeagueHref(league.externalId, {
                    tab: "top-stats",
                  }),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {upcomingFixtures.length > 0 ? (
        <Card className="w-full">
          <CardHeader className="gap-2">
            <CardTitle className="font-heading text-base">
              Upcoming matches
            </CardTitle>
            <CardDescription>Next fixtures in this competition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingFixtures.map((fixture) => (
              <MatchRow
                key={fixture.externalId}
                fixture={fixture}
                showLeague={false}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardContent className="pt-6">
            <EmptyState
              icon={CalendarDaysIcon}
              title="No upcoming fixtures"
              description="There are no scheduled matches left in this season window."
              actions={[
                {
                  label: "Browse league fixtures",
                  href: buildFixturesHref({ league: league.externalId }),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
