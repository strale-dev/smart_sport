import { MatchOverviewLiveClient } from "@/components/match/MatchOverviewLiveClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { aggregateForm } from "@/lib/analytics/compute-form";
import { getOverviewLayout } from "@/lib/fixtures/overview-layout";
import { getRecentForm } from "@/lib/services/analyticsService";
import {
  getFixtureEvents,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import type { Fixture, FormSnapshot } from "@/types/domain";

type MatchOverviewPanelProps = {
  fixture: Fixture;
};

const EMPTY_FORM: FormSnapshot = aggregateForm([], "ALL", 10);

export async function MatchOverviewPanel({ fixture }: MatchOverviewPanelProps) {
  const fixtureId = fixture.externalId;
  const overviewMode = getOverviewLayout(fixture.status);
  const needsFormFallback = overviewMode === "pre";

  const [
    { data: stats },
    { data: events },
    homeForm10,
    awayForm10,
    playersToWatch,
  ] = await Promise.all([
    getFixtureStatistics(fixtureId),
    getFixtureEvents(fixtureId),
    needsFormFallback
      ? getRecentForm(fixture.homeTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM),
    needsFormFallback
      ? getRecentForm(fixture.awayTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM),
    getPlayersToWatch(fixture),
  ]);

  if (overviewMode === "live") {
    return (
      <MatchOverviewLiveClient
        fixture={fixture}
        homeForm={homeForm10}
        awayForm={awayForm10}
        playersToWatch={playersToWatch}
      />
    );
  }

  return (
    <OverviewTabContent
      fixture={fixture}
      stats={stats}
      events={events}
      momentumBuckets={[]}
      homeForm={homeForm10}
      awayForm={awayForm10}
      playersToWatch={playersToWatch}
    />
  );
}
