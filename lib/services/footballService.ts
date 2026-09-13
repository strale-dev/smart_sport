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
  getTopRedCards as getTopRedCardsEndpoint,
  getTopScorers as getTopScorersEndpoint,
  getTopYellowCards as getTopYellowCardsEndpoint,
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
import { isApiFootballIngestOnly, isLivePollingEnabled } from "@/lib/env";
import {
  isOptionalProviderFailure,
  safeOptionalProviderFetch,
} from "@/lib/api-football/safe-call";
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
  type CachedResult,
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
  providerLeagueTopStatsKey,
  providerLeagueTopYellowCardsKey,
  providerLeagueTopRedCardsKey,
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
import { buildLeagueStatLeaderboards } from "@/lib/leagues/top-stats";
import { footballSeasonCandidates } from "@/lib/players/season";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  LeagueDetail,
  LeaguePlayerLeaderboardRow,
  LeagueStatLeaderboard,
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

async function cachedProviderOrDb<T>(options: {
  key: string;
  freshTtlSeconds: number | ((value: T) => number);
  staleTtlSeconds: number;
  providerFn: () => Promise<T>;
  dbFn: () => Promise<T>;
  label: string;
  /** When true, call the provider even if API_FOOTBALL_INGEST_ONLY is set (live list). */
  forceProvider?: boolean;
}): Promise<CachedResult<T>> {
  if (isApiFootballIngestOnly() && !options.forceProvider) {
    return cached({
      key: options.key,
      freshTtlSeconds: options.freshTtlSeconds,
      staleTtlSeconds: options.staleTtlSeconds,
      fn: options.dbFn,
    });
  }

  try {
    return await cached({
      key: options.key,
      freshTtlSeconds: options.freshTtlSeconds,
      staleTtlSeconds: options.staleTtlSeconds,
      fn: options.providerFn,
    });
  } catch (error) {
    if (!isOptionalProviderFailure(error)) {
      throw error;
    }

    console.warn(
      `[footballService] ${options.label} provider failed, using database`,
      error
    );

    const value = await options.dbFn();
    return {
      value,
      meta: {
        cached: false,
        stale: true,
      },
    };
  }
}

export async function getMatchesForDate(
  date: string
): Promise<ServiceResult<Fixture[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixturesDateKey(date),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    providerFn: () => listFixturesByDateEndpoint(date),
    dbFn: () => readFixturesForDateFromDb(date),
    label: "getMatchesForDate",
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
  const result = await cachedProviderOrDb({
    key: providerFixtureKey(id),
    freshTtlSeconds: (fixture) =>
      fixture
        ? fixtureFreshTtlSeconds(fixture.status)
        : CACHE_TTL.fixtureNonLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStale,
    providerFn: () => getFixtureByIdEndpoint(id),
    dbFn: () => readFixtureByProviderIdFromDb(id),
    label: "getFixtureById",
  });

  return toServiceResult(result);
}

export async function listLiveFixtures(): Promise<ServiceResult<Fixture[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixturesLiveKey(),
    freshTtlSeconds: CACHE_TTL.fixturesLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixturesLiveStale,
    providerFn: () => listLiveFixturesEndpoint(),
    dbFn: () => readLiveFixturesFromDb(),
    label: "listLiveFixtures",
    forceProvider: isLivePollingEnabled(),
  });

  return toServiceResult(result);
}

export async function getFixtureEvents(
  fixtureId: number
): Promise<ServiceResult<FixtureEvent[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureEventsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureEventsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureEventsStale,
    providerFn: () => getFixtureEventsEndpoint(fixtureId),
    dbFn: () => readFixtureEventsFromDb(fixtureId),
    label: "getFixtureEvents",
  });

  return toServiceResult(result);
}

export async function getFixtureStatistics(
  fixtureId: number
): Promise<ServiceResult<FixtureTeamStatistics[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureStatsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
    providerFn: () => getFixtureStatisticsEndpoint(fixtureId),
    dbFn: () => readFixtureStatisticsFromDb(fixtureId),
    label: "getFixtureStatistics",
  });

  return toServiceResult(result);
}

export async function getFixtureLineups(
  fixtureId: number
): Promise<ServiceResult<Lineup[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureLineupsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureLineupsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureLineupsStale,
    providerFn: () => getFixtureLineupsEndpoint(fixtureId),
    dbFn: () => readLineupsFromDb(fixtureId),
    label: "getFixtureLineups",
  });

  return toServiceResult(result);
}

export async function getFixturePlayers(
  fixtureId: number
): Promise<ServiceResult<FixturePlayerPerformance[]>> {
  if (isApiFootballIngestOnly()) {
    return emptyIngestOnlyResult([]);
  }

  const players = await safeOptionalProviderFetch(
    "getFixturePlayers",
    async () => {
      const result = await cached({
        key: providerFixturePlayersKey(fixtureId),
        freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
        staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
        fn: () => getFixturePlayersEndpoint(fixtureId),
      });
      return result.value;
    },
    []
  );

  return {
    data: players,
    meta: {
      cached: false,
      stale: players.length === 0,
    },
  };
}

export async function getTeamById(
  id: number
): Promise<ServiceResult<Team | null>> {
  const result = await cachedProviderOrDb({
    key: providerTeamKey(id),
    freshTtlSeconds: CACHE_TTL.teamFresh,
    staleTtlSeconds: CACHE_TTL.teamStale,
    providerFn: () => getTeamByIdEndpoint(id),
    dbFn: () => readTeamByProviderIdFromDb(id),
    label: "getTeamById",
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

      return safeOptionalProviderFetch(
        `standings ${leagueId}/${season}`,
        () => getStandingsEndpoint(leagueId, season),
        []
      );
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
    fn: () =>
      safeOptionalProviderFetch(
        `top scorers ${leagueProviderId}/${seasonYear}`,
        () => getTopScorersEndpoint(leagueProviderId, seasonYear),
        []
      ),
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
    fn: () =>
      safeOptionalProviderFetch(
        `top assists ${leagueProviderId}/${seasonYear}`,
        () => getTopAssistsEndpoint(leagueProviderId, seasonYear),
        []
      ),
  });

  return toServiceResult(result);
}

export async function getLeagueTopStats(
  leagueProviderId: number,
  seasonYear: number
): Promise<ServiceResult<LeagueStatLeaderboard[]>> {
  const result = await cached({
    key: providerLeagueTopStatsKey(leagueProviderId, seasonYear),
    freshTtlSeconds: CACHE_TTL.leagueTopScorersFresh,
    staleTtlSeconds: CACHE_TTL.leagueTopScorersStale,
    fn: async () => {
      const [topScorers, topAssists, topYellowCards, topRedCards] =
        await Promise.all([
          safeOptionalProviderFetch(
            `top scorers ${leagueProviderId}/${seasonYear}`,
            () => getTopScorersEndpoint(leagueProviderId, seasonYear),
            []
          ),
          safeOptionalProviderFetch(
            `top assists ${leagueProviderId}/${seasonYear}`,
            () => getTopAssistsEndpoint(leagueProviderId, seasonYear),
            []
          ),
          safeOptionalProviderFetch(
            `top yellow cards ${leagueProviderId}/${seasonYear}`,
            () => getTopYellowCardsEndpoint(leagueProviderId, seasonYear),
            []
          ),
          safeOptionalProviderFetch(
            `top red cards ${leagueProviderId}/${seasonYear}`,
            () => getTopRedCardsEndpoint(leagueProviderId, seasonYear),
            []
          ),
        ]);

      return buildLeagueStatLeaderboards({
        topScorers,
        topAssists,
        topYellowCards,
        topRedCards,
      });
    },
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
