import {
  mapLeagueDetail,
  mapLeaguePlayerLeaderboardRow,
  mapStandingsGroup,
} from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type {
  RawApiFootballLeagueDetail,
  RawApiFootballPlayer,
  RawApiFootballStandingsGroup,
} from "@/lib/api-football/types";
import type {
  LeaguePlayerLeaderboardRow,
  Season,
  StandingsGroup,
} from "@/types/domain";

export async function getLeagueById(id: number) {
  const response = await apiFootballFetchResponse<RawApiFootballLeagueDetail>(
    "/leagues",
    { id }
  );
  const raw = response[0];
  return raw ? mapLeagueDetail(raw) : null;
}

export async function listSeasonsByLeague(leagueId: number): Promise<Season[]> {
  const detail = await getLeagueById(leagueId);
  return detail?.seasons ?? [];
}

export async function getStandings(
  leagueId: number,
  season: number
): Promise<StandingsGroup[]> {
  const response = await apiFootballFetchResponse<RawApiFootballStandingsGroup>(
    "/standings",
    { league: leagueId, season }
  );
  return response.flatMap(mapStandingsGroup);
}

export async function getTopScorers(
  leagueId: number,
  season: number
): Promise<LeaguePlayerLeaderboardRow[]> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players/topscorers",
    { league: leagueId, season }
  );

  return response.map((raw, index) =>
    mapLeaguePlayerLeaderboardRow(raw, index + 1)
  );
}

export async function getTopAssists(
  leagueId: number,
  season: number
): Promise<LeaguePlayerLeaderboardRow[]> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players/topassists",
    { league: leagueId, season }
  );

  return response.map((raw, index) =>
    mapLeaguePlayerLeaderboardRow(raw, index + 1)
  );
}

export async function getLeagueByIdWithRaw(id: number) {
  const response = await apiFootballFetchResponse<RawApiFootballLeagueDetail>(
    "/leagues",
    { id }
  );
  const raw = response[0];
  return raw ? { raw, domain: mapLeagueDetail(raw) } : null;
}

export async function listLeagues() {
  const response =
    await apiFootballFetchResponse<RawApiFootballLeagueDetail>("/leagues");
  return response.map((raw) => ({
    raw,
    domain: mapLeagueDetail(raw),
  }));
}
