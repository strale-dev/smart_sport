import Link from "next/link";
import { CalendarDaysIcon, UsersIcon } from "lucide-react";

import { FixturesNowAnchor } from "@/components/fixtures/FixturesNowAnchor";
import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueFilterLogo } from "@/components/live/LeagueFilterLogo";
import type { Fixture } from "@/types/domain";
import type { FixturesDayGroup } from "@/lib/fixtures/grouping";

export type GroupedFixturesData = {
  dayGroups: FixturesDayGroup[];
  nowAnchorFixtureId: number | null;
  todayDateKey: string;
  followedTeamProviderIds?: number[];
  isEmpty: boolean;
  emptyReason?: "no_follows" | "no_matches" | null;
};

type GroupedFixturesListProps = {
  data: GroupedFixturesData;
};

function anchorIdForFixture(
  fixtureId: number,
  nowAnchorFixtureId: number | null
): string | undefined {
  return fixtureId === nowAnchorFixtureId ? `fixture-${fixtureId}` : undefined;
}

function isFollowedFixture(
  fixture: Fixture,
  followedTeamProviderIds: number[]
): boolean {
  return followedTeamProviderIds.some(
    (teamId) =>
      teamId === fixture.homeTeam.externalId ||
      teamId === fixture.awayTeam.externalId
  );
}

export function GroupedFixturesList({ data }: GroupedFixturesListProps) {
  if (data.isEmpty) {
    if (data.emptyReason === "no_follows") {
      return (
        <div className="space-y-4">
          <EmptyState
            icon={UsersIcon}
            title="No followed teams yet"
            description="Follow clubs to see their upcoming and recent matches here. Team following arrives in a later release."
          />
          <p className="text-center">
            <Link
              href="/fixtures"
              className="text-primary text-sm font-medium hover:underline"
            >
              Browse fixtures
            </Link>
          </p>
        </div>
      );
    }

    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="No matches for your teams"
        description="There are no followed-team fixtures in the last 30 days or next year."
      />
    );
  }

  const followedTeamProviderIds = data.followedTeamProviderIds ?? [];

  return (
    <>
      <FixturesNowAnchor
        fixtureId={data.nowAnchorFixtureId}
        todayDateKey={data.todayDateKey}
      />

      <div className="space-y-8">
        {data.dayGroups.map((dayGroup) => (
          <section
            key={dayGroup.dateKey}
            id={`day-${dayGroup.dateKey}`}
            className="scroll-mt-24 space-y-4"
          >
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
                          highlight={isFollowedFixture(
                            fixture,
                            followedTeamProviderIds
                          )}
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
                    highlight={isFollowedFixture(
                      fixture,
                      followedTeamProviderIds
                    )}
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
