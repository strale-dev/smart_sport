import { MatchStandingsTable } from "@/components/match/MatchStandingsTable";
import { getStandings } from "@/lib/services/footballService";
import type { Fixture, StandingsGroup } from "@/types/domain";

type MatchStandingsPanelProps = {
  fixture: Fixture;
};

export async function MatchStandingsPanel({
  fixture,
}: MatchStandingsPanelProps) {
  let standings: StandingsGroup[] = [];

  if (fixture.seasonYear) {
    try {
      const result = await getStandings(
        fixture.league.externalId,
        fixture.seasonYear
      );
      standings = result.data;
    } catch (error: unknown) {
      console.warn("[match] standings unavailable", error);
    }
  }

  return (
    <MatchStandingsTable
      leagueName={fixture.league.name}
      standings={standings}
      homeTeamExternalId={fixture.homeTeam.externalId}
      awayTeamExternalId={fixture.awayTeam.externalId}
    />
  );
}
