import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueFilterLogo } from "@/components/live/LeagueFilterLogo";
import { groupFixturesByDayAndLeague } from "@/lib/fixtures/grouping";
import type { Fixture } from "@/types/domain";

type TeamGroupedMatchesListProps = {
  live: Fixture[];
  upcoming: Fixture[];
  past: Fixture[];
};

function GroupedFixtureSection({
  title,
  fixtures,
  now,
}: {
  title: string;
  fixtures: Fixture[];
  now: Date;
}) {
  if (fixtures.length === 0) {
    return null;
  }

  const dayGroups = groupFixturesByDayAndLeague(fixtures, undefined, now);

  return (
    <section className="space-y-4">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      <div className="space-y-6">
        {dayGroups.map((dayGroup) => (
          <div key={dayGroup.dateKey} className="space-y-4">
            <h4 className="font-heading text-sm font-medium">
              {dayGroup.label}
            </h4>
            {dayGroup.leagues ? (
              <div className="space-y-4">
                {dayGroup.leagues.map((leagueGroup) => (
                  <div key={leagueGroup.providerId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {leagueGroup.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={leagueGroup.logoUrl}
                          alt=""
                          className="size-4 shrink-0 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <LeagueFilterLogo
                          providerId={leagueGroup.providerId}
                          label={leagueGroup.label}
                        />
                      )}
                      <p className="text-muted-foreground text-sm font-medium">
                        {leagueGroup.label}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {leagueGroup.fixtures.map((fixture) => (
                        <MatchRow
                          key={fixture.externalId}
                          fixture={fixture}
                          showLeague={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {dayGroup.fixtures?.map((fixture) => (
                  <MatchRow
                    key={fixture.externalId}
                    fixture={fixture}
                    showLeague={false}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TeamGroupedMatchesList({
  live,
  upcoming,
  past,
}: TeamGroupedMatchesListProps) {
  const now = new Date();

  if (live.length === 0 && upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="No matches yet"
        description="Fixtures for this team will appear here once they are synced."
      />
    );
  }

  return (
    <div className="space-y-8">
      <GroupedFixtureSection title="Live" fixtures={live} now={now} />
      <GroupedFixtureSection title="Upcoming" fixtures={upcoming} now={now} />
      <GroupedFixtureSection title="Past" fixtures={past} now={now} />
    </div>
  );
}
