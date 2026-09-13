import { TrophyIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { buildFixturesHref } from "@/lib/fixtures/url";
import type { FixtureStatus } from "@/types/domain";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { cn } from "@/lib/utils";
import { selectRelevantStandingsGroup } from "@/lib/standings/select-relevant-group";
import { selectStandingsGroupForTeam } from "@/lib/standings/select-team-group";
import type { StandingsGroup } from "@/types/domain";

type MatchStandingsTableProps = {
  leagueName: string;
  standings: StandingsGroup[];
  homeTeamExternalId?: number;
  awayTeamExternalId?: number;
  highlightTeamExternalId?: number;
  leagueExternalId?: number;
  fixtureId?: number;
  fixtureStatus?: FixtureStatus;
  homeTeamName?: string;
  awayTeamName?: string;
};

function isHighlightedRow(
  teamExternalId: number,
  props: MatchStandingsTableProps
): boolean {
  if (props.highlightTeamExternalId != null) {
    return teamExternalId === props.highlightTeamExternalId;
  }

  return (
    teamExternalId === props.homeTeamExternalId ||
    teamExternalId === props.awayTeamExternalId
  );
}

export function MatchStandingsTable(props: MatchStandingsTableProps) {
  const { leagueName, standings } = props;

  const primaryGroup =
    props.highlightTeamExternalId != null
      ? selectStandingsGroupForTeam(standings, props.highlightTeamExternalId)
      : selectRelevantStandingsGroup(
          standings,
          props.homeTeamExternalId ?? 0,
          props.awayTeamExternalId ?? 0
        );

  if (!primaryGroup || primaryGroup.rows.length === 0) {
    const matchEmptyFixture =
      props.fixtureId != null &&
      props.fixtureStatus != null &&
      props.leagueExternalId != null &&
      props.homeTeamExternalId != null &&
      props.homeTeamName != null &&
      props.awayTeamExternalId != null &&
      props.awayTeamName != null
        ? {
            externalId: props.fixtureId,
            status: props.fixtureStatus,
            homeTeam: {
              externalId: props.homeTeamExternalId,
              name: props.homeTeamName,
            },
            awayTeam: {
              externalId: props.awayTeamExternalId,
              name: props.awayTeamName,
            },
            league: {
              externalId: props.leagueExternalId,
              name: leagueName,
            },
          }
        : null;

    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Standings</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          {matchEmptyFixture ? (
            <MatchEmptyStateFromFixture
              id="standings"
              fixture={matchEmptyFixture}
              icon={TrophyIcon}
            />
          ) : (
            <EmptyState
              icon={TrophyIcon}
              title="League table not available yet"
              description={`We do not have a standings table for ${leagueName} right now.`}
              actions={
                props.leagueExternalId != null
                  ? [
                      {
                        label: "Browse fixtures",
                        href: buildFixturesHref(
                          {},
                          { league: props.leagueExternalId }
                        ),
                      },
                    ]
                  : undefined
              }
            />
          )}
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Standings</MatchCardTitle>
        <MatchCardDescription>
          {leagueName}
          {primaryGroup.groupName && primaryGroup.groupName !== "Overall"
            ? ` · ${primaryGroup.groupName}`
            : ""}
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-border/70 border-b text-left">
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Team</th>
              <th className="px-2 py-2 text-right font-medium">P</th>
              <th className="px-2 py-2 text-right font-medium">GD</th>
              <th className="px-2 py-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {primaryGroup.rows.map((row) => {
              const highlighted = isHighlightedRow(row.team.externalId, props);

              return (
                <tr
                  key={row.team.externalId}
                  className={cn(
                    "border-border/50 border-b last:border-b-0",
                    highlighted && "bg-primary/10"
                  )}
                >
                  <td className="px-2 py-2 font-mono tabular-nums">
                    {row.rank}
                  </td>
                  <td className="px-2 py-2 font-medium">{row.team.name}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">
                    {row.played ?? "–"}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">
                    {row.goalsDiff ?? "–"}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">
                    {row.points ?? "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
