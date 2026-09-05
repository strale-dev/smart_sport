import { LineupsCard } from "@/components/match/LineupsCard";
import { getFixtureLineups } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

type MatchLineupsPanelProps = {
  fixture: Fixture;
};

export async function MatchLineupsPanel({ fixture }: MatchLineupsPanelProps) {
  const { data: lineups } = await getFixtureLineups(fixture.externalId);
  return <LineupsCard fixture={fixture} lineups={lineups} />;
}
