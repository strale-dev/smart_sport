import {
  mapSearchTeam,
  mapTeam,
  mapTeamSeasonStatistics,
} from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type {
  RawApiFootballTeamDetail,
  RawApiFootballTeamSeasonStatistics,
} from "@/lib/api-football/types";
import type { Team, TeamSeasonStatistics } from "@/types/domain";

export async function getTeamById(id: number): Promise<Team | null> {
  const response = await apiFootballFetchResponse<RawApiFootballTeamDetail>(
    "/teams",
    { id }
  );
  const raw = response[0];
  return raw ? mapTeam(raw.team, raw.venue ?? undefined) : null;
}

export async function searchTeams(query: string): Promise<Team[]> {
  const response = await apiFootballFetchResponse<RawApiFootballTeamDetail>(
    "/teams",
    { search: query }
  );
  return response.map(mapSearchTeam);
}

export async function getTeamByIdWithRaw(id: number) {
  const response = await apiFootballFetchResponse<RawApiFootballTeamDetail>(
    "/teams",
    { id }
  );
  const raw = response[0];
  return raw
    ? { raw, domain: mapTeam(raw.team, raw.venue ?? undefined) }
    : null;
}

export async function getTeamSeasonStatistics(params: {
  teamId: number;
  leagueId: number;
  season: number;
}): Promise<TeamSeasonStatistics | null> {
  const response =
    await apiFootballFetchResponse<RawApiFootballTeamSeasonStatistics>(
      "/teams/statistics",
      {
        team: params.teamId,
        league: params.leagueId,
        season: params.season,
      }
    );
  const raw = response[0];
  return raw ? mapTeamSeasonStatistics(raw) : null;
}
