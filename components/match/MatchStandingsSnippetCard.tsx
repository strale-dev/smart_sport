import { TrophyIcon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { selectRelevantStandingsGroup } from "@/lib/standings/select-relevant-group";
import type { Fixture, StandingsGroup, StandingRow } from "@/types/domain";

type MatchStandingsSnippetCardProps = {
  fixture: Fixture;
  standings: StandingsGroup[];
};

function findRow(
  rows: StandingRow[],
  teamExternalId: number
): StandingRow | undefined {
  return rows.find((row) => row.team.externalId === teamExternalId);
}

export function MatchStandingsSnippetCard({
  fixture,
  standings,
}: MatchStandingsSnippetCardProps) {
  const group = selectRelevantStandingsGroup(
    standings,
    fixture.homeTeam.externalId,
    fixture.awayTeam.externalId
  );

  const homeRow = group
    ? findRow(group.rows, fixture.homeTeam.externalId)
    : undefined;
  const awayRow = group
    ? findRow(group.rows, fixture.awayTeam.externalId)
    : undefined;

  const snippetRows = [homeRow, awayRow].filter(
    (row): row is StandingRow => row != null
  );

  if (snippetRows.length === 0) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Standings</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="standings"
            fixture={fixture}
            icon={TrophyIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Standings</MatchCardTitle>
        <MatchCardDescription>
          {fixture.league.name}
          {group?.groupName && group.groupName !== "Overall"
            ? ` · ${group.groupName}`
            : ""}
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border/60 border-b text-left text-xs">
                <th className="pr-3 pb-2 font-medium">#</th>
                <th className="pr-3 pb-2 font-medium">Team</th>
                <th className="pr-3 pb-2 text-right font-medium">GD</th>
                <th className="pb-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {snippetRows.map((row) => (
                <tr
                  key={row.team.externalId}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="py-2 pr-3 font-mono tabular-nums">
                    {row.rank}
                  </td>
                  <td className="py-2 pr-3 font-medium">{row.team.name}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {row.goalsDiff ?? "—"}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {row.points ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
