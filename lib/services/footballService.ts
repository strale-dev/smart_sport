import {
  getFixtureById as getFixtureByIdEndpoint,
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureLineups as getFixtureLineupsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
  listFixturesByDate as listFixturesByDateEndpoint,
  listFixturesByLeagueSeason as listFixturesByLeagueSeasonEndpoint,
  listLiveFixtures as listLiveFixturesEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import {
  getLeagueById as getLeagueByIdEndpoint,
  getStandings as getStandingsEndpoint,
  getTopAssists as getTopAssistsEndpoint,
  getTopScorers as getTopScorersEndpoint,
  listSeasonsByLeague as listSeasonsByLeagueEndpoint,
} from "@/lib/api-football/endpoints/leagues";
import {
  getPlayerById as getPlayerByIdEndpoint,
  getPlayerProfileById as getPlayerProfileByIdEndpoint,
  searchPlayers as searchPlayersEndpoint,
} from "@/lib/api-football/endpoints/players";
import {
  getTeamById as getTeamByIdEndpoint,
  getTeamSeasonStatistics as getTeamSeasonStatisticsEndpoint,
  searchTeams as searchTeamsEndpoint,
} from "@/lib/api-football/endpoints/teams";
import { getTeamSquad as getTeamSquadEndpoint } from "@/lib/api-football/endpoints/players";
import { isApiFootballIngestOnly } from "@/lib/env";
import { safeOptionalProviderFetch } from "@/lib/api-football/safe-call";
import { addUtcDays, utcDateString } from "@/lib/fixtures/window";
import {
  persistPlayerProfile,
  upsertSquadPlayers,
} from "@/lib/ingestion/match-details-upsert";
import { squadPlayerToDomainPlayer } from "@/lib/players/from-squad";
import {
  readFixtureByProviderIdFromDb,
  readFixtureEventsFromDb,
  readFixtureStatisticsFromDb,
  readFixturesForDateFromDb,
  readFixturesForLeagueSeasonFromDb,
  readFixturesForTeamsInRangeFromDb,
  readFixturesInRangeFromDb,
  readLeagueDetailFromDb,
  readLineupsFromDb,
  readLiveFixturesFromDb,
  readPlayerByProviderIdFromDb,
  readSeasonsByLeagueFromDb,
  readStandingsFromDb,
  readTeamByProviderIdFromDb,
  readTeamIdByProviderIdFromDb,
} from "@/lib/ingestion/db-read";
import {
  cached,
  peekCachedValue,
  writeCachedValue,
  type CacheMeta,
} from "@/lib/redis/cache";
import {
  CACHE_TTL,
  fixtureFreshTtlSeconds,
  providerFixtureEventsKey,
  providerFixtureKey,
  providerFixtureLineupsKey,
  providerFixturePlayersKey,
  providerFixturesDateKey,
  providerFixturesLiveKey,
  providerFixturesRangeKey,
  providerFixtureStatsKey,
  providerLeagueFixturesKey,
  providerLeagueKey,
  providerLeagueTopAssistsKey,
  providerLeagueTopScorersKey,
  providerPlayerKey,
  providerSearchPlayersKey,
  providerSearchTeamsKey,
  providerSeasonsKey,
  providerStandingsKey,
  providerTeamFixturesKey,
  providerTeamKey,
  providerTeamSquadKey,
  providerTeamStatisticsKey,
} from "@/lib/redis/keys";
import {
  TEAM_MATCHES_FUTURE_DAYS,
  TEAM_MATCHES_PAST_DAYS,
} from "@/lib/teams/constants";
import { footballSeasonCandidates } from "@/lib/players/season";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  LeagueDetail,
  LeaguePlayerLeaderboardRow,
  Lineup,
  Player,
  Season,
  SquadPlayer,
  StandingsGroup,
  Team,
  TeamSeasonStatistics,
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

function emptyIngestOnlyResult<T>(value: T): ServiceResult<T> {
  return {
    data: value,
    meta: {
      cached: false,
      stale: false,
    },
  };
}

export async function getMatchesForDate(
  date: string
): Promise<ServiceResult<Fixture[]>> {
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixturesDateKey(date),
      freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
      staleTtlSeconds: CACHE_TTL.fixturesDateStale,
      fn: () => readFixturesForDateFromDb(date),
    });

    return toServiceResult(result);
  }

  const result = await cached({
    key: providerFixturesDateKey(date),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    fn: () => listFixturesByDateEndpoint(date),
  });

  return toServiceResult(result);
}

export async function getMatchesInRange(
  fromDate: string,
  toDateExclusive: string
): Promise<ServiceResult<Fixture[]>> {
  const result = await cached({
    key: providerFixturesRangeKey(fromDate, toDateExclusive),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    fn: () => readFixturesInRangeFromDb(fromDate, toDateExclusive),
  });

  return toServiceResult(result);
}

export async function getFixtureById(
  id: number
): Promise<ServiceResult<Fixture | null>> {
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixtureKey(id),
      freshTtlSeconds: CACHE_TTL.fixtureNonLiveFresh,
      staleTtlSeconds: CACHE_TTL.fixtureStale,
      fn: () => readFixtureByProviderIdFromDb(id),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixturesLiveKey(),
      freshTtlSeconds: CACHE_TTL.fixturesLiveFresh,
      staleTtlSeconds: CACHE_TTL.fixturesLiveStale,
      fn: () => readLiveFixturesFromDb(),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixtureEventsKey(fixtureId),
      freshTtlSeconds: CACHE_TTL.fixtureEventsFresh,
      staleTtlSeconds: CACHE_TTL.fixtureEventsStale,
      fn: () => readFixtureEventsFromDb(fixtureId),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixtureStatsKey(fixtureId),
      freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
      staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
      fn: () => readFixtureStatisticsFromDb(fixtureId),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixtureLineupsKey(fixtureId),
      freshTtlSeconds: CACHE_TTL.fixtureLineupsFresh,
      staleTtlSeconds: CACHE_TTL.fixtureLineupsStale,
      fn: () => readLineupsFromDb(fixtureId),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    return emptyIngestOnlyResult([]);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerTeamKey(id),
      freshTtlSeconds: CACHE_TTL.teamFresh,
      staleTtlSeconds: CACHE_TTL.teamStale,
      fn: () => readTeamByProviderIdFromDb(id),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    return emptyIngestOnlyResult([]);
  }

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
  const fromDb = await readPlayerByProviderIdFromDb(id).catch(
    (error: unknown) => {
      console.warn("[player] DB lookup failed", error);
      return null;
    }
  );

  if (fromDb) {
    return {
      data: fromDb,
      meta: { cached: false, stale: false },
    };
  }

  const cachedPlayer = await peekCachedValue<Player>(providerPlayerKey(id));
  if (cachedPlayer) {
    return {
      data: cachedPlayer,
      meta: { cached: true, stale: false },
    };
  }

  const fromApi = await fetchPlayerFromProvider(id);

  if (!fromApi) {
    return {
      data: null,
      meta: { cached: false, stale: false },
    };
  }

  await persistPlayerProfile(fromApi).catch((error: unknown) => {
    console.warn("[player] failed to persist provider player", error);
  });

  await writeCachedValue(
    providerPlayerKey(id),
    fromApi,
    CACHE_TTL.playerStale
  ).catch(() => undefined);

  const persisted = await readPlayerByProviderIdFromDb(id).catch(() => null);

  return {
    data: persisted ?? fromApi,
    meta: { cached: false, stale: false },
  };
}

async function fetchPlayerFromProvider(id: number): Promise<Player | null> {
  const profile = await safeOptionalProviderFetch(
    `player profile ${id}`,
    () => getPlayerProfileByIdEndpoint(id),
    null
  );

  if (profile) {
    return profile;
  }

  for (const season of footballSeasonCandidates()) {
    const player = await safeOptionalProviderFetch(
      `player ${id}/${season}`,
      () => getPlayerByIdEndpoint(id, season),
      null
    );

    if (player) {
      return player;
    }
  }

  return null;
}

export function buildTeamFixturesWindow(now = new Date()): {
  fromDate: string;
  toDateExclusive: string;
} {
  const today = utcDateString(now);

  return {
    fromDate: addUtcDays(today, -TEAM_MATCHES_PAST_DAYS),
    toDateExclusive: addUtcDays(today, TEAM_MATCHES_FUTURE_DAYS + 1),
  };
}

export async function getFixturesForTeam(
  teamProviderId: number,
  now = new Date()
): Promise<ServiceResult<Fixture[]>> {
  const { fromDate, toDateExclusive } = buildTeamFixturesWindow(now);

  const result = await cached({
    key: providerTeamFixturesKey(teamProviderId, fromDate, toDateExclusive),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    fn: async () => {
      const teamId = await readTeamIdByProviderIdFromDb(teamProviderId);

      if (!teamId) {
        return [];
      }

      return readFixturesForTeamsInRangeFromDb(
        [teamId],
        `${fromDate}T00:00:00.000Z`,
        `${toDateExclusive}T00:00:00.000Z`
      );
    },
  });

  return toServiceResult(result);
}

export async function searchPlayers(
  query: string
): Promise<ServiceResult<Player[]>> {
  if (isApiFootballIngestOnly()) {
    return emptyIngestOnlyResult([]);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerLeagueKey(id),
      freshTtlSeconds: CACHE_TTL.leagueFresh,
      staleTtlSeconds: CACHE_TTL.leagueStale,
      fn: () => readLeagueDetailFromDb(id),
    });

    return toServiceResult(result);
  }

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
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerSeasonsKey(leagueId),
      freshTtlSeconds: CACHE_TTL.seasonsFresh,
      staleTtlSeconds: CACHE_TTL.seasonsStale,
      fn: () => readSeasonsByLeagueFromDb(leagueId),
    });

    return toServiceResult(result);
  }

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
    fn: async () => {
      if (isApiFootballIngestOnly()) {
        const fromDb = await readStandingsFromDb(leagueId, season);
        if (fromDb.length > 0) {
          return fromDb;
        }
      }

      return getStandingsEndpoint(leagueId, season);
    },
  });

  return toServiceResult(result);
}

export async function getLeagueDetail(
  id: number
): Promise<ServiceResult<LeagueDetail | null>> {
  const result = await cached({
    key: providerLeagueKey(id),
    freshTtlSeconds: CACHE_TTL.leagueFresh,
    staleTtlSeconds: CACHE_TTL.leagueStale,
    fn: async () => {
      if (isApiFootballIngestOnly()) {
        const fromDb = await readLeagueDetailFromDb(id);
        if (fromDb) {
          return fromDb;
        }
      }

      return getLeagueByIdEndpoint(id);
    },
  });

  return toServiceResult(result);
}

export async function getFixturesForLeagueSeason(
  leagueProviderId: number,
  seasonYear: number
): Promise<ServiceResult<Fixture[]>> {
  const result = await cached({
    key: providerLeagueFixturesKey(leagueProviderId, seasonYear),
    freshTtlSeconds: CACHE_TTL.leagueFixturesFresh,
    staleTtlSeconds: CACHE_TTL.leagueFixturesStale,
    fn: async () => {
      if (isApiFootballIngestOnly()) {
        const fromDb = await readFixturesForLeagueSeasonFromDb(
          leagueProviderId,
          seasonYear
        );

        if (fromDb.length > 0) {
          return fromDb;
        }
      }

      return listFixturesByLeagueSeasonEndpoint(leagueProviderId, seasonYear);
    },
  });

  return toServiceResult(result);
}

export async function getLeagueTopScorers(
  leagueProviderId: number,
  seasonYear: number
): Promise<ServiceResult<LeaguePlayerLeaderboardRow[]>> {
  const result = await cached({
    key: providerLeagueTopScorersKey(leagueProviderId, seasonYear),
    freshTtlSeconds: CACHE_TTL.leagueTopScorersFresh,
    staleTtlSeconds: CACHE_TTL.leagueTopScorersStale,
    fn: () => getTopScorersEndpoint(leagueProviderId, seasonYear),
  });

  return toServiceResult(result);
}

export async function getLeagueTopAssists(
  leagueProviderId: number,
  seasonYear: number
): Promise<ServiceResult<LeaguePlayerLeaderboardRow[]>> {
  const result = await cached({
    key: providerLeagueTopAssistsKey(leagueProviderId, seasonYear),
    freshTtlSeconds: CACHE_TTL.leagueTopScorersFresh,
    staleTtlSeconds: CACHE_TTL.leagueTopScorersStale,
    fn: () => getTopAssistsEndpoint(leagueProviderId, seasonYear),
  });

  return toServiceResult(result);
}

export async function getTeamSquad(
  teamProviderId: number
): Promise<ServiceResult<SquadPlayer[]>> {
  const result = await cached({
    key: providerTeamSquadKey(teamProviderId),
    freshTtlSeconds: CACHE_TTL.teamFresh,
    staleTtlSeconds: CACHE_TTL.teamStale,
    fn: () =>
      safeOptionalProviderFetch(
        `team squad ${teamProviderId}`,
        () => getTeamSquadEndpoint(teamProviderId),
        []
      ),
  });

  if (result.value.length > 0) {
    await persistSquadPlayers(teamProviderId, result.value);
  }

  return toServiceResult(result);
}

async function persistSquadPlayers(
  teamProviderId: number,
  squad: SquadPlayer[]
): Promise<void> {
  const teamRef = {
    externalId: teamProviderId,
    name: "Unknown",
    code: null,
    logoUrl: null,
    isNational: false,
  };

  await upsertSquadPlayers(teamProviderId, squad).catch((error: unknown) => {
    console.warn("[team] failed to persist squad players", error);
  });

  await Promise.all(
    squad.map((member) =>
      writeCachedValue(
        providerPlayerKey(member.externalId),
        squadPlayerToDomainPlayer(member, teamRef),
        CACHE_TTL.playerStale
      ).catch(() => undefined)
    )
  );
}

export async function getTeamSeasonStatistics(
  teamProviderId: number,
  leagueProviderId: number,
  seasonYear: number
): Promise<ServiceResult<TeamSeasonStatistics | null>> {
  const result = await cached({
    key: providerTeamStatisticsKey(
      teamProviderId,
      leagueProviderId,
      seasonYear
    ),
    freshTtlSeconds: CACHE_TTL.standingsFresh,
    staleTtlSeconds: CACHE_TTL.standingsStale,
    fn: () =>
      safeOptionalProviderFetch(
        `team statistics ${teamProviderId}/${leagueProviderId}/${seasonYear}`,
        () =>
          getTeamSeasonStatisticsEndpoint({
            teamId: teamProviderId,
            leagueId: leagueProviderId,
            season: seasonYear,
          }),
        null
      ),
  });

  return toServiceResult(result);
}
