import { MatchOverviewLiveClient } from "@/components/match/MatchOverviewLiveClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import {
  readFixtureEventsFromDb,
  readFixturePlayerPerformancesFromDb,
  readFixtureStatisticsFromDb,
  readLineupsFromDb,
  readFixtureSidelinedFromDb,
  readStandingsFromDb,
} from "@/lib/ingestion/db-read";
import { hydrateMatchOverviewFromProvider } from "@/lib/ingestion/ensure-match-overview";
import { resolveMatchFixtureContext } from "@/lib/match/fixture-context";
import { getUnavailableOverviewCards } from "@/lib/match/overview-block-status";
import { pickPlayerOfTheMatch } from "@/lib/match/pick-player-of-the-match";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import { computeH2H, computeRecentForm } from "@/lib/services/analyticsService";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import type { Fixture, H2HSummary, StandingsGroup } from "@/types/domain";

type MatchOverviewPanelProps = {
  fixture: Fixture;
  liveSnapshot?: MatchLiveSnapshot;
  returnTo: string;
};

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
  returnTo,
}: MatchOverviewPanelProps) {
  const fixtureId = fixture.externalId;
  const renderMode = getMatchOverviewRenderMode(fixture.status);

  const hydrateReport = await hydrateMatchOverviewFromProvider(fixture);
  const unavailableCards = getUnavailableOverviewCards(hydrateReport);

  const needsPreExtras = renderMode === "pre";
  const matchCtx = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });
  const needsFinishedPlayers = renderMode === "finished";
  const needsLineupPerformances =
    renderMode === "finished" || renderMode === "live";

  const [
    stats,
    events,
    homeForm3,
    awayForm3,
    h2hAll,
    playersToWatch,
    lineups,
    sidelined,
    standings,
    players,
    lineupPerformances,
  ] = await Promise.all([
    readFixtureStatisticsFromDb(fixtureId),
    readFixtureEventsFromDb(fixtureId),
    computeRecentForm(fixture.homeTeam.externalId, {
      matches: 3,
      scope: "ALL",
    }),
    computeRecentForm(fixture.awayTeam.externalId, {
      matches: 3,
      scope: "ALL",
    }),
    needsPreExtras
      ? computeH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
          windowSize: 10,
          scope: "ALL",
        })
      : Promise.resolve(emptyH2hSummary(fixture)),
    getPlayersToWatch(fixture),
    readLineupsFromDb(fixtureId),
    readFixtureSidelinedFromDb(fixtureId),
    needsPreExtras && fixture.seasonYear && matchCtx.supportsStandings
      ? readStandingsFromDb(fixture.league.externalId, fixture.seasonYear)
      : Promise.resolve([] as StandingsGroup[]),
    needsFinishedPlayers
      ? readFixturePlayerPerformancesFromDb(fixtureId)
      : Promise.resolve([]),
    needsLineupPerformances
      ? readFixturePlayerPerformancesFromDb(fixtureId)
      : Promise.resolve([]),
  ]);

  const playerOfTheMatch = needsFinishedPlayers
    ? pickPlayerOfTheMatch(players)
    : null;

  if (renderMode === "live") {
    return (
      <MatchOverviewLiveClient
        fixture={fixture}
        returnTo={returnTo}
        initialEvents={events}
        initialStatistics={stats}
        homeForm3={homeForm3}
        awayForm3={awayForm3}
        playersToWatch={playersToWatch}
        lineups={lineups}
        lineupPerformances={lineupPerformances}
        lineupSidelined={sidelined}
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
      renderMode={renderMode}
      returnTo={returnTo}
      events={events}
      momentumBuckets={momentumBuckets}
      homeForm3={homeForm3}
      awayForm3={awayForm3}
      h2h={h2hAll}
      standings={standings}
      playersToWatch={playersToWatch}
      lineups={lineups}
      lineupPerformances={lineupPerformances}
      lineupSidelined={sidelined}
      playerOfTheMatch={playerOfTheMatch}
      unavailableCards={unavailableCards}
    />
  );
}
