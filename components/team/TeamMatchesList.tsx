import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import type { Fixture } from "@/types/domain";

type TeamMatchesListProps = {
  live: Fixture[];
  upcoming: Fixture[];
  past: Fixture[];
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

export function TeamMatchesList({
  live,
  upcoming,
  past,
}: TeamMatchesListProps) {
  if (live.length === 0 && upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="No matches yet"
        description="Fixtures for this team will appear here once they are synced."
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <MatchGroup title="Live" fixtures={live} />
      <MatchGroup title="Upcoming" fixtures={upcoming} />
      <MatchGroup title="Past" fixtures={past} />
    </div>
  );
}
