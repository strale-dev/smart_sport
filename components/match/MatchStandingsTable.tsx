import { TrophyIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrophyIcon}
            title="Standings unavailable"
            description="Run standings sync or check back once the league table is ingested."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-base">Standings</CardTitle>
        <CardDescription>
          {leagueName}
          {primaryGroup.groupName && primaryGroup.groupName !== "Overall"
            ? ` · ${primaryGroup.groupName}`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
      </CardContent>
    </Card>
  );
}
