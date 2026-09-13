import { LiveProbabilityDeltaClient } from "@/components/match/LiveProbabilityDeltaClient";
import { MatchOverviewLiveClient } from "@/components/match/MatchOverviewLiveClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { aggregateForm } from "@/lib/analytics/compute-form";
import {
  getMatchOverviewRenderMode,
  getOverviewLayout,
} from "@/lib/fixtures/overview-layout";
import { shouldReuseLiveOverviewSnapshot } from "@/lib/match/overview-panel-invariants";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import { getH2H, getRecentForm } from "@/lib/services/analyticsService";
import {
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import type { Fixture, FormSnapshot, H2HSummary } from "@/types/domain";

type MatchOverviewPanelProps = {
  fixture: Fixture;
  liveSnapshot?: MatchLiveSnapshot;
};

const EMPTY_FORM_5: FormSnapshot = aggregateForm([], "ALL", 5);
const EMPTY_FORM_10: FormSnapshot = aggregateForm([], "ALL", 10);

function emptyH2hSummary(fixture: Fixture): H2HSummary {
  return summarizeH2HMeetings(
    [],
    fixture.homeTeam.externalId,
    fixture.awayTeam.externalId,
    10,
    "ALL"
  );
}

export async function MatchOverviewPanel({
  fixture,
  liveSnapshot,
}: MatchOverviewPanelProps) {
  const fixtureId = fixture.externalId;
  const overviewMode = getOverviewLayout(fixture.status);
  const renderMode = getMatchOverviewRenderMode(fixture.status);
  const needsFormFallback = overviewMode === "pre";
  const snapshotForReuse =
    shouldReuseLiveOverviewSnapshot(renderMode, liveSnapshot) && liveSnapshot
      ? liveSnapshot
      : undefined;

  const [
    statsResult,
    eventsResult,
    homeForm5,
    homeForm10,
    awayForm5,
    awayForm10,
    h2hAll,
    playersToWatch,
    lineupsResult,
  ] = await Promise.all([
    snapshotForReuse
      ? Promise.resolve({ data: snapshotForReuse.statistics })
      : getFixtureStatistics(fixtureId),
    snapshotForReuse
      ? Promise.resolve({ data: snapshotForReuse.events })
      : getFixtureEvents(fixtureId),
    needsFormFallback
      ? getRecentForm(fixture.homeTeam.externalId, {
          matches: 5,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM_5),
    needsFormFallback
      ? getRecentForm(fixture.homeTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM_10),
    needsFormFallback
      ? getRecentForm(fixture.awayTeam.externalId, {
          matches: 5,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM_5),
    needsFormFallback
      ? getRecentForm(fixture.awayTeam.externalId, {
          matches: 10,
          scope: "ALL",
        })
      : Promise.resolve(EMPTY_FORM_10),
    needsFormFallback
      ? getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
          windowSize: 10,
          scope: "ALL",
        })
      : Promise.resolve(emptyH2hSummary(fixture)),
    getPlayersToWatch(fixture),
    getFixtureLineups(fixtureId),
  ]);

  const stats = statsResult.data;
  const events = eventsResult.data;
  const lineups = lineupsResult.data;

  if (renderMode === "live") {
    return (
      <MatchOverviewLiveClient
        fixture={fixture}
        initialEvents={events}
        initialStatistics={stats}
        homeForm={homeForm10}
        awayForm={awayForm10}
        playersToWatch={playersToWatch}
        lineups={lineups}
      />
    );
  }

  const momentumBuckets =
    renderMode === "finished"
      ? computeMatchMomentum(events, stats, fixture.minute ?? 90)
      : [];

  return (
    <OverviewTabContent
      fixture={fixture}
      stats={stats}
      events={events}
      momentumBuckets={momentumBuckets}
      homeForm={homeForm10}
      awayForm={awayForm10}
      homeForm5={homeForm5}
      awayForm5={awayForm5}
      h2hAll={h2hAll}
      playersToWatch={playersToWatch}
      lineups={lineups}
      probabilityDelta={
        renderMode === "finished" ? (
          <LiveProbabilityDeltaClient
            key="probabilityDelta"
            fixtureProviderId={fixture.externalId}
            fixtureStatus={fixture.status}
            emptyFixture={fixture}
          />
        ) : undefined
      }
    />
  );
}
