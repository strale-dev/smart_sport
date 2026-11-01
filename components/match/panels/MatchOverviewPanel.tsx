import { MatchOverviewLiveClient } from "@/components/match/MatchOverviewLiveClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { aggregateForm } from "@/lib/analytics/compute-form";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import {
  computeFormBefore,
  computeH2HBefore,
} from "@/lib/analytics/point-in-time";
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
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { getPlayersToWatch } from "@/lib/services/playersToWatchService";
import type { Fixture, H2HSummary, StandingsGroup } from "@/types/domain";

type MatchOverviewPanelProps = {
  fixture: Fixture;
  liveSnapshot?: MatchLiveSnapshot;
  returnTo: string;
  premiumAnalytics: boolean;
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

async function resolveFixtureTeamUuids(fixtureExternalId: number): Promise<{
  homeTeamUuid: string;
  awayTeamUuid: string;
} | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("home_team_id, away_team_id")
    .eq("provider_id", fixtureExternalId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve team ids for fixture ${fixtureExternalId}: ${error.message}`
    );
  }

  if (!data?.home_team_id || !data?.away_team_id) {
    return null;
  }

  return {
    homeTeamUuid: data.home_team_id,
    awayTeamUuid: data.away_team_id,
  };
}

async function loadOverviewFormBeforeKickoff(input: {
  teamProviderId: number;
  teamUuid: string;
  kickoffAt: string;
}) {
  const form = await computeFormBefore(
    input.teamProviderId,
    input.teamUuid,
    input.kickoffAt,
    5,
    "ALL"
  );
  return aggregateForm(form.results.slice(0, 3), "ALL", 3);
}

export async function MatchOverviewPanel({
  fixture,
  returnTo,
  premiumAnalytics,
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

  const teamUuids = await resolveFixtureTeamUuids(fixtureId);
  const pitBeforeAt = fixture.kickoffAt;

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
    teamUuids
      ? loadOverviewFormBeforeKickoff({
          teamProviderId: fixture.homeTeam.externalId,
          teamUuid: teamUuids.homeTeamUuid,
          kickoffAt: pitBeforeAt,
        })
      : Promise.resolve(aggregateForm([], "ALL", 3)),
    teamUuids
      ? loadOverviewFormBeforeKickoff({
          teamProviderId: fixture.awayTeam.externalId,
          teamUuid: teamUuids.awayTeamUuid,
          kickoffAt: pitBeforeAt,
        })
      : Promise.resolve(aggregateForm([], "ALL", 3)),
    needsPreExtras && teamUuids
      ? computeH2HBefore(
          fixture.homeTeam.externalId,
          fixture.awayTeam.externalId,
          teamUuids.homeTeamUuid,
          teamUuids.awayTeamUuid,
          pitBeforeAt,
          10
        )
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
        premiumAnalytics={premiumAnalytics}
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
      premiumAnalytics={premiumAnalytics}
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
