import { LineupsCard } from "@/components/match/LineupsCard";
import { hydrateMatchOverviewFromProvider } from "@/lib/ingestion/ensure-match-overview";
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
  await hydrateMatchOverviewFromProvider(fixture);

  const [lineupsResult, performancesResult, eventsResult, sidelinedResult] =
    await Promise.all([
      getFixtureLineups(fixture.externalId, { forceProvider: true }),
      getFixturePlayers(fixture.externalId, { forceProvider: true }),
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
