import {
  getFixtureById as getFixtureByIdEndpoint,
  getFixtureByIdWithRaw,
  getFixtureEvents as getFixtureEventsEndpoint,
  getFixtureLineups as getFixtureLineupsEndpoint,
  getFixturePlayers as getFixturePlayersEndpoint,
  getFixtureStatistics as getFixtureStatisticsEndpoint,
  listFixturesByDate as listFixturesByDateEndpoint,
  listFixturesByLeagueSeason as listFixturesByLeagueSeasonEndpoint,
  listLiveFixtures as listLiveFixturesEndpoint,
} from "@/lib/api-football/endpoints/fixtures";
import { getFixtureInjuries as getFixtureInjuriesEndpoint } from "@/lib/api-football/endpoints/injuries";
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
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import { addUtcDays, utcDateString } from "@/lib/fixtures/window";
import { isLeagueInAllowlist } from "@/lib/ingestion/config";
import { ensureFixturePersisted } from "@/lib/ingestion/ensure-fixture-persisted";
import {
  fillFixturesForUtcDateFromProvider,
  fillFixturesForUtcDateRangeFromProvider,
} from "@/lib/services/fixture-provider-fill";
import {
  getFixtureUuidByProviderId,
  persistPlayerProfile,
  upsertLineups,
  upsertSquadPlayers,
} from "@/lib/ingestion/match-details-upsert";
import { squadPlayerToDomainPlayer } from "@/lib/players/from-squad";
import {
  readFixtureByProviderIdFromDb,
  readFixtureEventsFromDb,
  readFixturePlayerPerformancesFromDb,
  readFixtureStatisticsFromDb,
  readFixturesForDateFromDb,
  readFixturesForLeagueSeasonFromDb,
  readFixturesForTeamsInRangeFromDb,
  readFixturesInRangeFromDb,
  readLeagueDetailFromDb,
  readLineupsFromDb,
  readFixtureSidelinedFromDb,
  readLiveFixturesFromDb,
  readPlayerByProviderIdFromDb,
  readSeasonsByLeagueFromDb,
  readStandingsFromDb,
  readTeamByProviderIdFromDb,
  readTeamIdByProviderIdFromDb,
  readTeamSquadFromDb,
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
  providerFixtureSidelinedKey,
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
import { isAuthoritativeLivePresentation } from "@/lib/live/live-presentation";
import { createAdminClient } from "@/lib/supabase/admin";
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
  FixtureSidelinedPlayer,
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

async function readFixturesForDateWithProviderFill(
  date: string
): Promise<Fixture[]> {
  const fromDb = await readFixturesForDateFromDb(date);
  if (fromDb.length > 0 || !isApiFootballIngestOnly()) {
    return fromDb;
  }

  return fillFixturesForUtcDateFromProvider(date);
}

export async function getMatchesForDate(
  date: string
): Promise<ServiceResult<Fixture[]>> {
  if (isApiFootballIngestOnly()) {
    const result = await cached({
      key: providerFixturesDateKey(date),
      freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
      staleTtlSeconds: CACHE_TTL.fixturesDateStale,
      fn: () => readFixturesForDateWithProviderFill(date),
    });

    return toServiceResult(result);
  }

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

async function readFixturesInRangeWithProviderFill(
  fromDate: string,
  toDateExclusive: string
): Promise<Fixture[]> {
  const fromDb = await readFixturesInRangeFromDb(fromDate, toDateExclusive);
  if (fromDb.length > 0 || !isApiFootballIngestOnly()) {
    return fromDb;
  }

  return fillFixturesForUtcDateRangeFromProvider(fromDate, toDateExclusive);
}

export async function getMatchesInRange(
  fromDate: string,
  toDateExclusive: string
): Promise<ServiceResult<Fixture[]>> {
  const result = await cached({
    key: providerFixturesRangeKey(fromDate, toDateExclusive),
    freshTtlSeconds: CACHE_TTL.fixturesDateFresh,
    staleTtlSeconds: CACHE_TTL.fixturesDateStale,
    fn: () => readFixturesInRangeWithProviderFill(fromDate, toDateExclusive),
  });

  return toServiceResult(result);
}

async function resolveFixtureById(id: number): Promise<Fixture | null> {
  if (!isApiFootballIngestOnly()) {
    const fromProvider = await safeOptionalProviderFetch(
      `fixture ${id}`,
      () => getFixtureByIdEndpoint(id),
      null
    );
    if (fromProvider) {
      return fromProvider;
    }
  }

  const fromDb = await readFixtureByProviderIdFromDb(id);
  if (fromDb) {
    return fromDb;
  }

  await ensureFixturePersisted(id);
  const persisted = await readFixtureByProviderIdFromDb(id);
  if (persisted) {
    return persisted;
  }

  const fromProviderRaw = await safeOptionalProviderFetch(
    `fixture ${id}`,
    () => getFixtureByIdWithRaw(id),
    null
  );

  if (
    fromProviderRaw?.domain &&
    isLeagueInAllowlist(fromProviderRaw.domain.league.externalId)
  ) {
    return fromProviderRaw.domain;
  }

  return null;
}

export async function getFixtureById(
  id: number
): Promise<ServiceResult<Fixture | null>> {
  const result = await cached({
    key: providerFixtureKey(id),
    freshTtlSeconds: (fixture: Fixture | null) =>
      fixture
        ? fixtureFreshTtlSeconds(fixture.status)
        : CACHE_TTL.fixtureNonLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStale,
    fn: () => resolveFixtureById(id),
  });

  return toServiceResult(result);
}

export async function listLiveFixtures(): Promise<ServiceResult<Fixture[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixturesLiveKey(),
    freshTtlSeconds: CACHE_TTL.fixturesLiveFresh,
    staleTtlSeconds: CACHE_TTL.fixturesLiveStale,
    providerFn: async () =>
      filterAllowlistedFixtures(await listLiveFixturesEndpoint()),
    dbFn: () => readLiveFixturesFromDb(),
    label: "listLiveFixtures",
    forceProvider: isLivePollingEnabled(),
  });

  const filtered = {
    ...result,
    value: filterAllowlistedFixtures(result.value).filter((fixture) =>
      isAuthoritativeLivePresentation(fixture)
    ),
  };

  return toServiceResult(filtered);
}

export type FootballProviderOptions = {
  /** Prefer API-Football over DB (match Overview and other real-time views). */
  forceProvider?: boolean;
};

export async function getFixtureEvents(
  fixtureId: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<FixtureEvent[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureEventsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureEventsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureEventsStale,
    providerFn: () => getFixtureEventsEndpoint(fixtureId),
    dbFn: () => readFixtureEventsFromDb(fixtureId),
    label: "getFixtureEvents",
    forceProvider: options.forceProvider,
  });

  return toServiceResult(result);
}

export async function getFixtureStatistics(
  fixtureId: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<FixtureTeamStatistics[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureStatsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
    providerFn: () => getFixtureStatisticsEndpoint(fixtureId),
    dbFn: () => readFixtureStatisticsFromDb(fixtureId),
    label: "getFixtureStatistics",
    forceProvider: options.forceProvider,
  });

  return toServiceResult(result);
}

export async function getFixtureLineups(
  fixtureId: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<Lineup[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureLineupsKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureLineupsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureLineupsStale,
    providerFn: async () => {
      const lineups = await getFixtureLineupsEndpoint(fixtureId);
      if (lineups.length === 0) {
        return lineups;
      }

      try {
        const client = createAdminClient();
        const fixtureUuid = await getFixtureUuidByProviderId(client, fixtureId);
        if (fixtureUuid) {
          await upsertLineups(client, fixtureUuid, lineups);
        }
      } catch (error) {
        console.warn(
          `[footballService] failed to persist lineups ${fixtureId}`,
          error
        );
      }

      return lineups;
    },
    dbFn: () => readLineupsFromDb(fixtureId),
    label: "getFixtureLineups",
    forceProvider: options.forceProvider,
  });

  return toServiceResult(result);
}

export async function getFixtureSidelined(
  fixtureId: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<FixtureSidelinedPlayer[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixtureSidelinedKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureSidelinedFresh,
    staleTtlSeconds: CACHE_TTL.fixtureSidelinedStale,
    providerFn: () => getFixtureInjuriesEndpoint(fixtureId),
    dbFn: () => readFixtureSidelinedFromDb(fixtureId),
    label: "getFixtureSidelined",
    forceProvider: options.forceProvider,
  });

  return toServiceResult(result);
}

export async function getFixturePlayers(
  fixtureId: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<FixturePlayerPerformance[]>> {
  const result = await cachedProviderOrDb({
    key: providerFixturePlayersKey(fixtureId),
    freshTtlSeconds: CACHE_TTL.fixtureStatsFresh,
    staleTtlSeconds: CACHE_TTL.fixtureStatsStale,
    providerFn: () => getFixturePlayersEndpoint(fixtureId),
    dbFn: () => readFixturePlayerPerformancesFromDb(fixtureId),
    label: "getFixturePlayers",
    forceProvider: options.forceProvider,
  });

  return toServiceResult(result);
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
  season: number,
  options: FootballProviderOptions = {}
): Promise<ServiceResult<StandingsGroup[]>> {
  const result = await cached({
    key: providerStandingsKey(leagueId, season),
    freshTtlSeconds: CACHE_TTL.standingsFresh,
    staleTtlSeconds: CACHE_TTL.standingsStale,
    fn: async () => {
      if (options.forceProvider) {
        const fromApi = await safeOptionalProviderFetch(
          `standings ${leagueId}/${season}`,
          () => getStandingsEndpoint(leagueId, season),
          []
        );
        if (fromApi.length > 0) {
          return fromApi;
        }
        return readStandingsFromDb(leagueId, season);
      }

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

async function fetchTeamSquad(teamProviderId: number): Promise<SquadPlayer[]> {
  const fromDb = await readTeamSquadFromDb(teamProviderId);
  if (fromDb.length > 0) {
    return fromDb;
  }

  const fromProvider = await safeOptionalProviderFetch(
    `team squad ${teamProviderId}`,
    () => getTeamSquadEndpoint(teamProviderId),
    []
  );

  if (fromProvider.length > 0) {
    return fromProvider;
  }

  return fromDb;
}

export async function getTeamSquad(
  teamProviderId: number
): Promise<ServiceResult<SquadPlayer[]>> {
  const result = await cached({
    key: providerTeamSquadKey(teamProviderId),
    freshTtlSeconds: (squad) =>
      squad.length > 0 ? CACHE_TTL.teamFresh : CACHE_TTL.fixturesLiveFresh,
    staleTtlSeconds: CACHE_TTL.teamStale,
    fn: () => fetchTeamSquad(teamProviderId),
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
  const admin = createAdminClient();
  const { data: teamRow } = await admin
    .from("teams")
    .select("name, code, logo_url, is_national")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  const teamRef = {
    externalId: teamProviderId,
    name: teamRow?.name ?? "Unknown",
    code: teamRow?.code ?? null,
    logoUrl: teamRow?.logo_url ?? null,
    isNational: teamRow?.is_national ?? false,
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
