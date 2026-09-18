import { CalendarDaysIcon } from "lucide-react";

import { FixturesNowAnchor } from "@/components/fixtures/FixturesNowAnchor";
import { EmptyState } from "@/components/common/EmptyState";
import { MatchRow } from "@/components/match/MatchRow";
import { LeagueFilterLogo } from "@/components/live/LeagueFilterLogo";
import { daySectionAnchorId } from "@/lib/fixtures/ids";
import { buildFixturesHref } from "@/lib/fixtures/url";
import type { FixturesDayGroup } from "@/lib/fixtures/grouping";
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

function FixturesDayGroupsSection({
  dayGroups,
  todayDateKey,
  nowAnchorFixtureId,
  muted = false,
}: {
  dayGroups: FixturesDayGroup[];
  todayDateKey: string;
  nowAnchorFixtureId: number | null;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "space-y-6 opacity-90" : "space-y-8"}>
      {dayGroups.map((dayGroup) => (
        <section
          key={dayGroup.dateKey}
          id={daySectionAnchorId(dayGroup.dateKey)}
          className="scroll-mt-24 space-y-4"
        >
          <h2
            className={
              muted
                ? "text-muted-foreground font-heading text-sm font-medium"
                : "font-heading text-base font-medium"
            }
          >
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
                        todayDateKey={todayDateKey}
                        anchorId={anchorIdForFixture(
                          fixture.externalId,
                          nowAnchorFixtureId
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
                  todayDateKey={todayDateKey}
                  anchorId={anchorIdForFixture(
                    fixture.externalId,
                    nowAnchorFixtureId
                  )}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
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
              : "No fixtures in this window"
          }
          description={
            data.filters.league != null
              ? "Try another league or browse all upcoming matches."
              : "Check back when new matches are synced."
          }
          actions={
            data.filters.league != null
              ? [
                  {
                    label: "View all leagues",
                    href: buildFixturesHref({}),
                  },
                  { label: "Live Center", href: "/live", variant: "outline" },
                ]
              : [
                  { label: "Live Center", href: "/live" },
                  {
                    label: "Predictions Center",
                    href: "/predictions",
                    variant: "outline",
                  },
                ]
          }
        />
      </div>
    );
  }

  return (
    <>
      <FixturesNowAnchor
        fixtureId={data.nowAnchorFixtureId}
        todayDateKey={data.todayDateKey}
      />

      <div className="space-y-10">
        <FixturesDayGroupsSection
          dayGroups={data.upcomingDayGroups}
          todayDateKey={data.todayDateKey}
          nowAnchorFixtureId={data.nowAnchorFixtureId}
        />

        {data.pastDayGroups.length > 0 ? (
          <div className="border-border/60 space-y-4 border-t pt-8">
            <h2 className="text-muted-foreground font-heading text-sm font-semibold tracking-wide uppercase">
              Past results
            </h2>
            <FixturesDayGroupsSection
              dayGroups={data.pastDayGroups}
              todayDateKey={data.todayDateKey}
              nowAnchorFixtureId={null}
              muted
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
