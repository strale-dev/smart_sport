import {
  getFixtureById as getFixtureByIdEndpoint,
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureLineups as getFixtureLineupsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
  listFixturesByDate as listFixturesByDateEndpoint,
  listLiveFixtures as listLiveFixturesEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import {
  getLeagueById as getLeagueByIdEndpoint,
  getStandings as getStandingsEndpoint,
  listSeasonsByLeague as listSeasonsByLeagueEndpoint,
} from "@/lib/api-football/endpoints/leagues";
import {
  getPlayerById as getPlayerByIdEndpoint,
  searchPlayers as searchPlayersEndpoint,
} from "@/lib/api-football/endpoints/players";
import {
  getTeamById as getTeamByIdEndpoint,
  searchTeams as searchTeamsEndpoint,
} from "@/lib/api-football/endpoints/teams";
import { cached, type CacheMeta } from "@/lib/redis/cache";
import {
  CACHE_TTL,
  fixtureFreshTtlSeconds,
  providerFixtureEventsKey,
  providerFixtureKey,
  providerFixtureLineupsKey,
  providerFixturePlayersKey,
  providerFixturesDateKey,
  providerFixturesLiveKey,
  providerFixtureStatsKey,
  providerLeagueKey,
  providerPlayerKey,
  providerSearchPlayersKey,
  providerSearchTeamsKey,
  providerSeasonsKey,
  providerStandingsKey,
  providerTeamKey,
} from "@/lib/redis/keys";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  Lineup,
  Player,
  Season,
  StandingsGroup,
  Team,
} from "@/types/domain";

export type ServiceResult<T> = {
  data: T;
  meta: CacheMeta;
};

function toServiceResult<T>(result: {
  value: T;
  meta: CacheMeta;
}): ServiceResult<T> {
  return {
    data: result.value,
    meta: result.meta,
  };
}

// Postgres authoritative store — add read-through after cron ingest lands.

export async function getMatchesForDate(
  date: string
): Promise<ServiceResult<Fixture[]>> {
  const result = await cached({
    key: providerFixturesDateKey(date),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    fn: () => listFixturesByDateEndpoint(date),
  });

  return toServiceResult(result);
}

export async function getFixtureById(
  id: number
): Promise<ServiceResult<Fixture | null>> {
  const result = await cached({
    key: providerFixtureKey(id),
    freshTtlSeconds: (fixture) =>
      fixture
        ? fixtureFreshTtlSeconds(fixture.status)
        : CACHE_TTL.fixtureNonLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStale,
    fn: () => getFixtureByIdEndpoint(id),
  });

  return toServiceResult(result);
}

export async function listLiveFixtures(): Promise<ServiceResult<Fixture[]>> {
  const result = await cached({
    key: providerFixturesLiveKey(),
    freshTtlSeconds: CACHE_TTL.fixturesLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixturesLiveStale,
    fn: () => listLiveFixturesEndpoint(),
  });

  return toServiceResult(result);
}

export async function getFixtureEvents(
  fixtureId: number
): Promise<ServiceResult<FixtureEvent[]>> {
  const result = await cached({
    key: providerFixtureEventsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureEventsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureEventsStale,
    fn: () => getFixtureEventsEndpoint(fixtureId),
  });

  return toServiceResult(result);
}

export async function getFixtureStatistics(
  fixtureId: number
): Promise<ServiceResult<FixtureTeamStatistics[]>> {
  const result = await cached({
    key: providerFixtureStatsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
    fn: () => getFixtureStatisticsEndpoint(fixtureId),
  });

  return toServiceResult(result);
}

export async function getFixtureLineups(
  fixtureId: number
): Promise<ServiceResult<Lineup[]>> {
  const result = await cached({
    key: providerFixtureLineupsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureLineupsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureLineupsStale,
    fn: () => getFixtureLineupsEndpoint(fixtureId),
  });

  return toServiceResult(result);
}

export async function getFixturePlayers(
  fixtureId: number
): Promise<ServiceResult<FixturePlayerPerformance[]>> {
  const result = await cached({
    key: providerFixturePlayersKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
    fn: () => getFixturePlayersEndpoint(fixtureId),
  });

  return toServiceResult(result);
}

export async function getTeamById(
  id: number
): Promise<ServiceResult<Team | null>> {
  const result = await cached({
    key: providerTeamKey(id),
    freshTtlSeconds: CACHE_TTL.teamFresh,
    staleTtlSeconds: CACHE_TTL.teamStale,
    fn: () => getTeamByIdEndpoint(id),
  });

  return toServiceResult(result);
}

export async function searchTeams(
  query: string
): Promise<ServiceResult<Team[]>> {
  const result = await cached({
    key: providerSearchTeamsKey(query),
    freshTtlSeconds: CACHE_TTL.searchFresh,
    staleTtlSeconds: CACHE_TTL.searchStale,
    fn: () => searchTeamsEndpoint(query),
  });

  return toServiceResult(result);
}

export async function getPlayerById(
  id: number
): Promise<ServiceResult<Player | null>> {
  const result = await cached({
    key: providerPlayerKey(id),
    freshTtlSeconds: CACHE_TTL.playerFresh,
    staleTtlSeconds: CACHE_TTL.playerStale,
    fn: () => getPlayerByIdEndpoint(id),
  });

  return toServiceResult(result);
}

export async function searchPlayers(
  query: string
): Promise<ServiceResult<Player[]>> {
  const result = await cached({
    key: providerSearchPlayersKey(query),
    freshTtlSeconds: CACHE_TTL.searchFresh,
    staleTtlSeconds: CACHE_TTL.searchStale,
    fn: () => searchPlayersEndpoint(query),
  });

  return toServiceResult(result);
}

export async function getLeagueById(
  id: number
): Promise<ServiceResult<Awaited<ReturnType<typeof getLeagueByIdEndpoint>>>> {
  const result = await cached({
    key: providerLeagueKey(id),
    freshTtlSeconds: CACHE_TTL.leagueFresh,
    staleTtlSeconds: CACHE_TTL.leagueStale,
    fn: () => getLeagueByIdEndpoint(id),
  });

  return toServiceResult(result);
}

export async function listSeasonsByLeague(
  leagueId: number
): Promise<ServiceResult<Season[]>> {
  const result = await cached({
    key: providerSeasonsKey(leagueId),
    freshTtlSeconds: CACHE_TTL.seasonsFresh,
    staleTtlSeconds: CACHE_TTL.seasonsStale,
    fn: () => listSeasonsByLeagueEndpoint(leagueId),
  });

  return toServiceResult(result);
}

export async function getStandings(
  leagueId: number,
  season: number
): Promise<ServiceResult<StandingsGroup[]>> {
  const result = await cached({
    key: providerStandingsKey(leagueId, season),
    freshTtlSeconds: CACHE_TTL.standingsFresh,
    staleTtlSeconds: CACHE_TTL.standingsStale,
    fn: () => getStandingsEndpoint(leagueId, season),
  });

  return toServiceResult(result);
}
