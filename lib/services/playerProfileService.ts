import {
  getFixturePlayers as getFixturePlayersEndpoint,
  listFixturesByPlayer,
} from "@/lib/api-football/endpoints/fixtures";
import {
  getPlayerSeasonStatisticsFromApi,
  getPlayerTransfers,
} from "@/lib/api-football/endpoints/players";
import { mapPlayerCareerFromSeasonStatistics } from "@/lib/api-football/adapter";
import { safeOptionalProviderFetch } from "@/lib/api-football/safe-call";
import { isApiFootballIngestOnly } from "@/lib/env";
import { buildPlayerContributionBadges } from "@/lib/players/badges";
import {
  PLAYER_MATCHES_PAGE_SIZE,
  PLAYER_MATCH_HISTORY_SEASON_LOOKBACK,
} from "@/lib/players/constants";
import { footballSeasonCandidates } from "@/lib/players/season";
import {
  readPlayerCareerFromDb,
  readPlayerMatchHistoryFromDb,
} from "@/lib/ingestion/db-read";
import { cached } from "@/lib/redis/cache";
import {
  CACHE_TTL,
  providerPlayerMatchHistoryKey,
  providerPlayerStatsKey,
  providerPlayerTransfersKey,
} from "@/lib/redis/keys";
import type { ServiceResult } from "@/lib/services/footballService";
import type {
  Fixture,
  FixturePlayerPerformance,
  Player,
  PlayerCareerEntry,
  PlayerMatchAppearance,
  PlayerMatchHistoryPage,
  PlayerSeasonStatistics,
} from "@/types/domain";

type MatchHistoryOptions = {
  page?: number;
  pageSize?: number;
};

function toServiceResult<T>(result: {
  value: T;
  meta: { cached: boolean; stale: boolean; cachedAt?: string };
}): ServiceResult<T> {
  return {
    data: result.value,
    meta: result.meta,
  };
}

function emptyResult<T>(value: T): ServiceResult<T> {
  return {
    data: value,
    meta: { cached: false, stale: false },
  };
}

export function emptyPlayerMatchHistoryPage(
  page = 1,
  pageSize = PLAYER_MATCHES_PAGE_SIZE
): PlayerMatchHistoryPage {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  };
}

export function pickPrimarySeasonStatistics(
  stats: PlayerSeasonStatistics[],
  player: Player | null,
  seasonYear = new Date().getFullYear()
): PlayerSeasonStatistics | null {
  if (stats.length === 0) {
    return null;
  }

  const currentTeamId = player?.currentTeam?.externalId;

  const preferred =
    stats.find(
      (entry) =>
        entry.seasonYear === seasonYear &&
        entry.team.externalId === currentTeamId
    ) ??
    stats.find((entry) => entry.seasonYear === seasonYear) ??
    stats.find((entry) => entry.team.externalId === currentTeamId) ??
    stats[0];

  return preferred ?? null;
}

export async function getPlayerSeasonStatistics(
  playerId: number,
  seasonYear?: number
): Promise<ServiceResult<PlayerSeasonStatistics[]>> {
  if (isApiFootballIngestOnly()) {
    return emptyResult([]);
  }

  const years =
    seasonYear != null
      ? [seasonYear, seasonYear - 1]
      : footballSeasonCandidates();

  for (const year of years) {
    const result = await cached({
      key: providerPlayerStatsKey(playerId, year),
      freshTtlSeconds: CACHE_TTL.playerFresh,
      staleTtlSeconds: CACHE_TTL.playerStale,
      fn: () =>
        safeOptionalProviderFetch(
          `player stats ${playerId}/${year}`,
          () => getPlayerSeasonStatisticsFromApi(playerId, year),
          []
        ),
    });

    if (result.value.length > 0) {
      return toServiceResult(result);
    }
  }

  return emptyResult([]);
}

export async function getPlayerMatchHistory(
  playerId: number,
  options: MatchHistoryOptions = {}
): Promise<ServiceResult<PlayerMatchHistoryPage>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? PLAYER_MATCHES_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const dbResult = await readPlayerMatchHistoryFromDb(playerId, {
    limit: pageSize,
    offset,
  }).catch((error: unknown) => {
    console.warn("[playerProfile] DB match history unavailable", error);
    return null;
  });

  if (dbResult && dbResult.total > 0) {
    return {
      data: {
        items: dbResult.items,
        total: dbResult.total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(dbResult.total / pageSize)),
      },
      meta: { cached: false, stale: false },
    };
  }

  if (isApiFootballIngestOnly()) {
    return emptyResult(emptyPlayerMatchHistoryPage(page, pageSize));
  }

  const result = await cached({
    key: providerPlayerMatchHistoryKey(playerId),
    freshTtlSeconds: CACHE_TTL.playerFresh,
    staleTtlSeconds: CACHE_TTL.playerStale,
    fn: () =>
      safeOptionalProviderFetch(
        `player match history ${playerId}`,
        () => buildPlayerMatchHistoryFromApi(playerId),
        []
      ),
  });

  const total = result.value.length;
  const items = result.value.slice(offset, offset + pageSize);

  return toServiceResult({
    value: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    meta: result.meta,
  });
}

export async function getPlayerCareer(
  playerId: number,
  seasonStats: PlayerSeasonStatistics[] = []
): Promise<ServiceResult<PlayerCareerEntry[]>> {
  const dbCareer = await readPlayerCareerFromDb(playerId).catch(
    (error: unknown) => {
      console.warn("[playerProfile] DB career unavailable", error);
      return [] as PlayerCareerEntry[];
    }
  );

  if (dbCareer.length > 0) {
    return {
      data: dbCareer,
      meta: { cached: false, stale: false },
    };
  }

  if (isApiFootballIngestOnly()) {
    return emptyResult(mapPlayerCareerFromSeasonStatistics(seasonStats));
  }

  const result = await cached({
    key: providerPlayerTransfersKey(playerId),
    freshTtlSeconds: CACHE_TTL.playerFresh,
    staleTtlSeconds: CACHE_TTL.playerStale,
    fn: () =>
      safeOptionalProviderFetch(
        `player transfers ${playerId}`,
        async () => {
          const transfers = await getPlayerTransfers(playerId);
          if (transfers.length > 0) {
            return transfers;
          }

          return mapPlayerCareerFromSeasonStatistics(seasonStats);
        },
        mapPlayerCareerFromSeasonStatistics(seasonStats)
      ),
  });

  return toServiceResult(result);
}

async function buildPlayerMatchHistoryFromApi(
  playerId: number
): Promise<PlayerMatchAppearance[]> {
  const currentYear = new Date().getFullYear();
  const fixtures: Fixture[] = [];

  for (
    let index = 0;
    index < PLAYER_MATCH_HISTORY_SEASON_LOOKBACK;
    index += 1
  ) {
    const season = currentYear - index;
    const seasonFixtures = await safeOptionalProviderFetch(
      `player fixtures ${playerId}/${season}`,
      () => listFixturesByPlayer(playerId, season),
      []
    );
    fixtures.push(...seasonFixtures);
  }

  const finished = fixtures
    .filter((fixture) =>
      ["FT", "AET", "PEN", "AWD", "WO"].includes(fixture.status)
    )
    .sort((a, b) => Date.parse(b.kickoffAt) - Date.parse(a.kickoffAt));

  const performanceCache = new Map<number, FixturePlayerPerformance>();

  const appearances = await Promise.all(
    finished.map(async (fixture) => {
      let performance = performanceCache.get(fixture.externalId);

      if (!performance) {
        const performances = await safeOptionalProviderFetch(
          `fixture players ${fixture.externalId}`,
          () => getFixturePlayersEndpoint(fixture.externalId),
          []
        );
        const playerPerformance = performances.find(
          (entry) => entry.playerExternalId === playerId
        );

        if (playerPerformance) {
          performanceCache.set(fixture.externalId, playerPerformance);
          performance = playerPerformance;
        }
      }

      if (!performance) {
        return null;
      }

      return mapFixtureToPlayerAppearance(fixture, performance, playerId);
    })
  );

  return appearances.filter(
    (appearance): appearance is PlayerMatchAppearance => appearance != null
  );
}

function mapFixtureToPlayerAppearance(
  fixture: Fixture,
  performance: FixturePlayerPerformance,
  playerExternalId: number
): PlayerMatchAppearance {
  const isHome = performance.teamExternalId === fixture.homeTeam.externalId;
  const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
  const goalsAgainst = isHome
    ? (fixture.score.away ?? 0)
    : (fixture.score.home ?? 0);
  const position = mapApiPosition(performance.position);
  const cleanSheet =
    (position === "GK" || position === "DF") &&
    goalsAgainst === 0 &&
    (performance.minutes ?? 0) > 0;
  const goals = performance.goals ?? 0;
  const assists = performance.assists ?? 0;
  const yellowCards = performance.yellowCards ?? 0;
  const redCards = performance.redCards ?? 0;

  return {
    fixtureExternalId: fixture.externalId,
    kickoffAt: fixture.kickoffAt,
    leagueName: fixture.league.name,
    leagueLogoUrl: fixture.league.logoUrl,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeScore: fixture.score.home,
    awayScore: fixture.score.away,
    status: fixture.status,
    teamExternalId: performance.teamExternalId,
    opponent,
    isHome,
    minutes: performance.minutes,
    rating: performance.rating,
    goals,
    assists,
    yellowCards,
    redCards,
    cleanSheet,
    isMotm: false,
    badges: buildPlayerContributionBadges({
      goals,
      assists,
      yellowCards,
      redCards,
      cleanSheet,
      isMotm: false,
      events: [],
      playerExternalId,
      position,
    }),
  };
}

function mapApiPosition(
  value: string | null
): "GK" | "DF" | "MF" | "FW" | null {
  switch (value?.trim().toUpperCase()) {
    case "G":
    case "GK":
      return "GK";
    case "D":
    case "DF":
      return "DF";
    case "M":
    case "MF":
      return "MF";
    case "F":
    case "FW":
      return "FW";
    default:
      return null;
  }
}
