import { LineupUnavailableBlock } from "@/components/match/lineups/LineupUnavailableBlock";
import type { Fixture, FixtureSidelinedPlayer } from "@/types/domain";

type LineupAvailabilityOnlyProps = {
  fixture: Fixture;
  sidelined: FixtureSidelinedPlayer[];
};

function partitionByKind(players: FixtureSidelinedPlayer[]) {
  return {
    injured: players.filter((player) => player.kind === "injury"),
    suspended: players.filter((player) => player.kind === "suspension"),
  };
}

function TeamAvailability({
  teamName,
  sidelined,
}: {
  teamName: string;
  sidelined: FixtureSidelinedPlayer[];
}) {
  if (sidelined.length === 0) {
    return null;
  }

  const { injured, suspended } = partitionByKind(sidelined);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{teamName}</h3>
      <LineupUnavailableBlock title="Injured" players={injured} />
      <LineupUnavailableBlock title="Suspended" players={suspended} />
    </section>
  );
}

export function LineupAvailabilityOnly({
  fixture,
  sidelined,
}: LineupAvailabilityOnlyProps) {
  const homeSidelined = sidelined.filter(
    (player) => player.teamExternalId === fixture.homeTeam.externalId
  );
  const awaySidelined = sidelined.filter(
    (player) => player.teamExternalId === fixture.awayTeam.externalId
  );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Starting elevens are not published yet. Player availability below is
        from the provider.
      </p>
      <TeamAvailability
        teamName={fixture.homeTeam.name}
        sidelined={homeSidelined}
      />
      <TeamAvailability
        teamName={fixture.awayTeam.name}
        sidelined={awaySidelined}
      />
    </div>
  );
}
