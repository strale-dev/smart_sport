import { TeamGroupedMatchesList } from "@/components/team/TeamGroupedMatchesList";
import { splitFixturesByStatus } from "@/lib/teams/matches";
import type { Fixture } from "@/types/domain";

type LeagueFixturesTabProps = {
  fixtures: Fixture[];
};

export function LeagueFixturesTab({ fixtures }: LeagueFixturesTabProps) {
  const groups = splitFixturesByStatus(fixtures);

  return (
    <TeamGroupedMatchesList
      live={groups.live}
      upcoming={groups.upcoming}
      past={groups.past}
    />
  );
}
