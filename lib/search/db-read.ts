import { createAdminClient } from "@/lib/supabase/admin";
import type { FixtureStatus } from "@/types/domain";

export type DbSearchTeamRow = {
  id: string;
  provider_id: number;
  name: string;
  code: string | null;
  logo_url: string | null;
  country_name: string | null;
  elo_rating: number | null;
  sim: number;
};

export type DbSearchPlayerRow = {
  id: string;
  provider_id: number;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  position: string | null;
  team_provider_id: number | null;
  team_name: string | null;
  team_logo_url: string | null;
  sim: number;
};

export type DbSearchLeagueRow = {
  id: string;
  provider_id: number;
  name: string;
  logo_url: string | null;
  country_name: string | null;
  prestige_score: number | null;
  sim: number;
};

export type DbSearchFixtureRow = {
  provider_id: number;
  kickoff_at: string;
  status: FixtureStatus;
  score_home: number | null;
  score_away: number | null;
  home_provider_id: number;
  home_name: string;
  home_logo_url: string | null;
  away_provider_id: number;
  away_name: string;
  away_logo_url: string | null;
  league_provider_id: number;
  league_name: string;
  league_logo_url: string | null;
  sim: number;
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const client = createAdminClient();
  const { data, error } = await client.rpc(fn as "search_teams", args as never);

  if (error) {
    throw new Error(`[search] ${fn} failed: ${error.message}`);
  }

  return (data ?? []) as T[];
}

export async function searchTeamsFromDb(
  query: string,
  maxResults: number
): Promise<DbSearchTeamRow[]> {
  return rpc<DbSearchTeamRow>("search_teams", {
    q: query,
    max_results: maxResults,
  });
}

export async function searchPlayersFromDb(
  query: string,
  maxResults: number
): Promise<DbSearchPlayerRow[]> {
  return rpc<DbSearchPlayerRow>("search_players", {
    q: query,
    max_results: maxResults,
  });
}

export async function searchLeaguesFromDb(
  query: string,
  maxResults: number
): Promise<DbSearchLeagueRow[]> {
  return rpc<DbSearchLeagueRow>("search_leagues", {
    q: query,
    max_results: maxResults,
  });
}

export async function searchFixturesFromDb(
  query: string,
  maxResults: number,
  fromAt: string,
  toAt: string
): Promise<DbSearchFixtureRow[]> {
  return rpc<DbSearchFixtureRow>("search_fixtures", {
    q: query,
    max_results: maxResults,
    from_at: fromAt,
    to_at: toAt,
  });
}
