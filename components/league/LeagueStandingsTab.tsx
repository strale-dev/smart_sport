import { MatchStandingsTable } from "@/components/match/MatchStandingsTable";
import type { StandingsGroup } from "@/types/domain";

type LeagueStandingsTabProps = {
  leagueName: string;
  standings: StandingsGroup[];
};

export function LeagueStandingsTab({
  leagueName,
  standings,
}: LeagueStandingsTabProps) {
  return <MatchStandingsTable leagueName={leagueName} standings={standings} />;
}
