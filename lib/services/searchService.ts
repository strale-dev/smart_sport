import { isApiFootballIngestOnly } from "@/lib/env";
import {
  searchFixturesFromDb,
  searchLeaguesFromDb,
  searchPlayersFromDb,
  searchTeamsFromDb,
} from "@/lib/search/db-read";
import {
  MAX_SEARCH_QUERY_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
  normalizeSearchQuery,
} from "@/lib/search/normalize";
import { compareByScoreThenTieBreak, scoreTextMatch } from "@/lib/search/score";
import type {
  GlobalSearchMode,
  GlobalSearchResponse,
  SearchCategoryResults,
  SearchHit,
  SearchLeagueHit,
  SearchMatchHit,
  SearchPlayerHit,
  SearchTeamHit,
} from "@/lib/search/types";
import {
  buildLeagueSearchHref,
  buildMatchSearchHref,
  buildPlayerSearchHref,
  buildTeamSearchHref,
} from "@/lib/search/url";
import { cached } from "@/lib/redis/cache";
import { CACHE_TTL, globalSearchKey } from "@/lib/redis/keys";
import {
  searchPlayers as searchPlayersProvider,
  searchTeams as searchTeamsProvider,
} from "@/lib/services/footballService";
import type { FixtureStatus } from "@/types/domain";

const PALETTE_LIMIT = 5;
const FULL_LIMIT = 20;
const DB_CANDIDATE_LIMIT = 40;

const EMPTY_CATEGORY = <T extends SearchHit>(): SearchCategoryResults<T> => ({
  items: [],
  total: 0,
  hasMore: false,
});

function fixtureWindowBounds(now = new Date()): {
  fromAt: string;
  toAt: string;
} {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 14);
  return { fromAt: from.toISOString(), toAt: to.toISOString() };
}

function dedupeByProviderId<T extends SearchHit>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.type}:${item.providerId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

function sliceCategory<T extends SearchHit>(
  ranked: T[],
  limit: number
): SearchCategoryResults<T> {
  const items = ranked.slice(0, limit);
  return {
    items,
    total: ranked.length,
    hasMore: ranked.length > limit,
  };
}

function mapDbTeams(
  query: string,
  rows: Awaited<ReturnType<typeof searchTeamsFromDb>>
): SearchTeamHit[] {
  return rows
    .map((row) => {
      const score = scoreTextMatch({
        query,
        fields: [row.name, row.code, row.country_name],
        dbSimilarity: row.sim,
      });
      return {
        type: "team" as const,
        providerId: row.provider_id,
        name: row.name,
        code: row.code,
        logoUrl: row.logo_url,
        countryName: row.country_name,
        eloRating: row.elo_rating,
        href: buildTeamSearchHref(row.provider_id),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) =>
      compareByScoreThenTieBreak(a, b, (item) => item.eloRating ?? 0)
    );
}

function mapDbPlayers(
  query: string,
  rows: Awaited<ReturnType<typeof searchPlayersFromDb>>
): SearchPlayerHit[] {
  return rows
    .map((row) => {
      const score = scoreTextMatch({
        query,
        fields: [row.full_name, row.first_name, row.last_name],
        dbSimilarity: row.sim,
      });
      return {
        type: "player" as const,
        providerId: row.provider_id,
        fullName: row.full_name,
        photoUrl: row.photo_url,
        teamName: row.team_name,
        teamProviderId: row.team_provider_id,
        href: buildPlayerSearchHref(row.provider_id),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => compareByScoreThenTieBreak(a, b, () => 0));
}

function mapDbLeagues(
  query: string,
  rows: Awaited<ReturnType<typeof searchLeaguesFromDb>>
): SearchLeagueHit[] {
  return rows
    .map((row) => {
      const score = scoreTextMatch({
        query,
        fields: [row.name, row.country_name],
        dbSimilarity: row.sim,
      });
      return {
        type: "league" as const,
        providerId: row.provider_id,
        name: row.name,
        logoUrl: row.logo_url,
        countryName: row.country_name,
        href: buildLeagueSearchHref(row.provider_id),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) =>
      compareByScoreThenTieBreak(a, b, (item) => {
        const row = rows.find((r) => r.provider_id === item.providerId);
        return row?.prestige_score ?? 0;
      })
    );
}

function mapDbFixtures(
  query: string,
  rows: Awaited<ReturnType<typeof searchFixturesFromDb>>
): SearchMatchHit[] {
  const now = Date.now();
  return rows
    .map((row) => {
      const score = scoreTextMatch({
        query,
        fields: [
          row.home_name,
          row.away_name,
          row.league_name,
          `${row.home_name} ${row.away_name}`,
        ],
        dbSimilarity: row.sim,
      });
      return {
        type: "match" as const,
        providerId: Number(row.provider_id),
        kickoffAt: row.kickoff_at,
        status: row.status as FixtureStatus,
        scoreHome: row.score_home,
        scoreAway: row.score_away,
        home: {
          providerId: row.home_provider_id,
          name: row.home_name,
          logoUrl: row.home_logo_url,
        },
        away: {
          providerId: row.away_provider_id,
          name: row.away_name,
          logoUrl: row.away_logo_url,
        },
        league: {
          providerId: row.league_provider_id,
          name: row.league_name,
          logoUrl: row.league_logo_url,
        },
        href: buildMatchSearchHref(Number(row.provider_id)),
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      const liveStatuses = new Set<FixtureStatus>([
        "1H",
        "HT",
        "2H",
        "ET",
        "BT",
        "P",
        "LIVE",
      ]);
      const aLive = liveStatuses.has(a.status) ? 1 : 0;
      const bLive = liveStatuses.has(b.status) ? 1 : 0;
      if (aLive !== bLive) {
        return bLive - aLive;
      }
      const aDist = Math.abs(new Date(a.kickoffAt).getTime() - now);
      const bDist = Math.abs(new Date(b.kickoffAt).getTime() - now);
      return aDist - bDist;
    });
}

async function maybeProviderTeamsPlayers(
  query: string,
  dbTeamRowCount: number,
  dbPlayerRowCount: number
): Promise<{ teams: SearchTeamHit[]; players: SearchPlayerHit[] }> {
  if (isApiFootballIngestOnly()) {
    return { teams: [], players: [] };
  }
  if (query.length < 3) {
    return { teams: [], players: [] };
  }
  if (dbTeamRowCount > 0 || dbPlayerRowCount > 0) {
    return { teams: [], players: [] };
  }

  const [teamsResult, playersResult] = await Promise.all([
    searchTeamsProvider(query),
    searchPlayersProvider(query),
  ]);

  const teams: SearchTeamHit[] = (teamsResult.data ?? []).map((team) => ({
    type: "team",
    providerId: team.externalId,
    name: team.name,
    code: team.code,
    logoUrl: team.logoUrl,
    countryName: team.country?.name ?? null,
    eloRating: null,
    href: buildTeamSearchHref(team.externalId),
    score: scoreTextMatch({
      query,
      fields: [team.name, team.code, team.country?.name],
    }),
  }));

  const players: SearchPlayerHit[] = (playersResult.data ?? []).map(
    (player) => ({
      type: "player",
      providerId: player.externalId,
      fullName: player.fullName,
      photoUrl: player.photoUrl,
      teamName: player.currentTeam?.name ?? null,
      teamProviderId: player.currentTeam?.externalId ?? null,
      href: buildPlayerSearchHref(player.externalId),
      score: scoreTextMatch({
        query,
        fields: [player.fullName, player.firstName, player.lastName],
      }),
    })
  );

  return {
    teams: teams.filter((item) => item.score > 0),
    players: players.filter((item) => item.score > 0),
  };
}

function pickTopHit(
  response: Omit<GlobalSearchResponse, "topHit">
): SearchHit | null {
  const all: SearchHit[] = [
    ...response.teams.items,
    ...response.players.items,
    ...response.leagues.items,
    ...response.matches.items,
  ];
  if (all.length === 0) {
    return null;
  }
  return [...all].sort((a, b) => b.score - a.score)[0] ?? null;
}

export function emptyGlobalSearchResponse(query: string): GlobalSearchResponse {
  return {
    query,
    topHit: null,
    teams: EMPTY_CATEGORY(),
    players: EMPTY_CATEGORY(),
    leagues: EMPTY_CATEGORY(),
    matches: EMPTY_CATEGORY(),
  };
}

async function runGlobalSearch(
  rawQuery: string,
  mode: GlobalSearchMode
): Promise<GlobalSearchResponse> {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < MIN_SEARCH_QUERY_LENGTH) {
    return emptyGlobalSearchResponse(query);
  }
  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new Error("Query too long");
  }

  const limit = mode === "palette" ? PALETTE_LIMIT : FULL_LIMIT;
  const { fromAt, toAt } = fixtureWindowBounds();

  const [teamRows, playerRows, leagueRows, fixtureRows] = await Promise.all([
    searchTeamsFromDb(query, DB_CANDIDATE_LIMIT),
    searchPlayersFromDb(query, DB_CANDIDATE_LIMIT),
    searchLeaguesFromDb(query, DB_CANDIDATE_LIMIT),
    searchFixturesFromDb(query, DB_CANDIDATE_LIMIT, fromAt, toAt),
  ]);

  let teams = mapDbTeams(query, teamRows);
  let players = mapDbPlayers(query, playerRows);

  const providerExtra = await maybeProviderTeamsPlayers(
    query,
    teamRows.length,
    playerRows.length
  );
  teams = dedupeByProviderId([...teams, ...providerExtra.teams]);
  players = dedupeByProviderId([...players, ...providerExtra.players]);

  const leagues = mapDbLeagues(query, leagueRows);
  const matches = mapDbFixtures(query, fixtureRows);

  const topHit = pickTopHit({
    query,
    teams: { items: teams, total: teams.length, hasMore: teams.length > limit },
    players: {
      items: players,
      total: players.length,
      hasMore: players.length > limit,
    },
    leagues: {
      items: leagues,
      total: leagues.length,
      hasMore: leagues.length > limit,
    },
    matches: {
      items: matches,
      total: matches.length,
      hasMore: matches.length > limit,
    },
  });

  return {
    query,
    topHit,
    teams: sliceCategory(teams, limit),
    players: sliceCategory(players, limit),
    leagues: sliceCategory(leagues, limit),
    matches: sliceCategory(matches, limit),
  };
}

export async function globalSearch(
  rawQuery: string,
  mode: GlobalSearchMode = "palette"
): Promise<GlobalSearchResponse> {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < MIN_SEARCH_QUERY_LENGTH) {
    return emptyGlobalSearchResponse(query);
  }

  const result = await cached({
    key: globalSearchKey(query, mode),
    freshTtlSeconds: CACHE_TTL.searchFresh,
    staleTtlSeconds: CACHE_TTL.searchStale,
    fn: () => runGlobalSearch(query, mode),
  });

  return result.value;
}
