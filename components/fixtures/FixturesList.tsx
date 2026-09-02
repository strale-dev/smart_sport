import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";

import { FixturesNowAnchor } from "@/components/fixtures/FixturesNowAnchor";
import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueFilterLogo } from "@/components/live/LeagueFilterLogo";
import { buildFixturesHref } from "@/lib/fixtures/url";
import type { FixturesData } from "@/lib/services/fixturesService";

type FixturesListProps = {
  data: FixturesData;
};

function anchorIdForFixture(
  fixtureId: number,
  nowAnchorFixtureId: number | null
): string | undefined {
  return fixtureId === nowAnchorFixtureId ? `fixture-${fixtureId}` : undefined;
}

export function FixturesList({ data }: FixturesListProps) {
  if (data.isEmpty) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={CalendarDaysIcon}
          title={
            data.filters.league != null
              ? "No fixtures in this league"
              : "No fixtures in the next 7 days"
          }
          description={
            data.filters.league != null
              ? "Try another league or browse all upcoming matches."
              : "Check back when new matches are synced."
          }
        />
        {data.filters.league != null ? (
          <p className="text-center">
            <Link
              href={buildFixturesHref({})}
              className="text-primary text-sm font-medium hover:underline"
            >
              View all leagues
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <FixturesNowAnchor fixtureId={data.nowAnchorFixtureId} />

      <div className="space-y-8">
        {data.dayGroups.map((dayGroup) => (
          <section key={dayGroup.dateKey} className="space-y-4">
            <h2 className="font-heading text-base font-medium">
              {dayGroup.label}
            </h2>

            {dayGroup.leagues ? (
              <div className="space-y-6">
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
                      <h3 className="text-muted-foreground text-sm font-medium">
                        {leagueGroup.label}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {leagueGroup.fixtures.map((fixture) => (
                        <MatchRow
                          key={fixture.externalId}
                          fixture={fixture}
                          showLeague={false}
                          anchorId={anchorIdForFixture(
                            fixture.externalId,
                            data.nowAnchorFixtureId
                          )}
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
                    anchorId={anchorIdForFixture(
                      fixture.externalId,
                      data.nowAnchorFixtureId
                    )}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
