import { mapSearchTeam, mapTeam } from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballTeamDetail } from "@/lib/api-football/types";
import type { Team } from "@/types/domain";

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
