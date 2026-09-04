import { MatchStandingsTable } from "@/components/match/MatchStandingsTable";
import type { StandingsGroup } from "@/types/domain";

type TeamStandingsTabProps = {
  leagueName: string;
  standings: StandingsGroup[];
  teamExternalId: number;
};

export function TeamStandingsTab({
  leagueName,
  standings,
  teamExternalId,
}: TeamStandingsTabProps) {
  return (
    <MatchStandingsTable
      leagueName={leagueName}
      standings={standings}
      highlightTeamExternalId={teamExternalId}
    />
  );
}
