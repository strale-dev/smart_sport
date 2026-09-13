import { CalendarDaysIcon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { splitFixturesByStatus } from "@/lib/teams/matches";
import type { Fixture } from "@/types/domain";

type MatchTeamsFixturesListProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  fixtures: Fixture[];
};

function MatchGroup({
  title,
  fixtures,
}: {
  title: string;
  fixtures: Fixture[];
}) {
  if (fixtures.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      <div className="space-y-2">
        {fixtures.map((fixture) => (
          <MatchRow key={fixture.externalId} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}

export function MatchTeamsFixturesList({
  fixture,
  fixtures,
}: MatchTeamsFixturesListProps) {
  const groups = splitFixturesByStatus(fixtures);

  if (
    groups.live.length === 0 &&
    groups.upcoming.length === 0 &&
    groups.past.length === 0
  ) {
    return (
      <MatchEmptyStateFromFixture
        id="relatedFixtures"
        fixture={fixture}
        icon={CalendarDaysIcon}
      />
    );
  }

  return (
    <div className="space-y-6">
      <MatchGroup title="Live" fixtures={groups.live} />
      <MatchGroup title="Upcoming" fixtures={groups.upcoming} />
      <MatchGroup title="Past" fixtures={groups.past} />
    </div>
  );
}
