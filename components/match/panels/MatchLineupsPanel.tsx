import { LineupsCard } from "@/components/match/LineupsCard";
import {
  getFixtureEvents,
  getFixtureLineups,
  getFixturePlayers,
  getFixtureSidelined,
} from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

type MatchLineupsPanelProps = {
  fixture: Fixture;
};

export async function MatchLineupsPanel({ fixture }: MatchLineupsPanelProps) {
  const [lineupsResult, performancesResult, eventsResult, sidelinedResult] =
    await Promise.all([
      getFixtureLineups(fixture.externalId),
      getFixturePlayers(fixture.externalId),
      getFixtureEvents(fixture.externalId),
      getFixtureSidelined(fixture.externalId),
    ]);

  return (
    <LineupsCard
      fixture={fixture}
      lineups={lineupsResult.data}
      performances={performancesResult.data}
      events={eventsResult.data}
      sidelined={sidelinedResult.data}
    />
  );
}
