import {
  mapPlayer,
  mapSearchPlayer,
  mapTeamSquad,
} from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type {
  RawApiFootballPlayer,
  RawApiFootballSearchPlayer,
  RawApiFootballSquad,
} from "@/lib/api-football/types";
import type { Player, SquadPlayer } from "@/types/domain";

export async function getPlayerById(id: number): Promise<Player | null> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players",
    { id, season: new Date().getFullYear() }
  );
  const raw = response[0];
  return raw ? mapPlayer(raw) : null;
}

export async function searchPlayers(query: string): Promise<Player[]> {
  const response = await apiFootballFetchResponse<RawApiFootballSearchPlayer>(
    "/players",
    { search: query }
  );
  return response.map(mapSearchPlayer);
}

export async function getPlayerByIdWithRaw(id: number) {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players",
    { id, season: new Date().getFullYear() }
  );
  const raw = response[0];
  return raw ? { raw, domain: mapPlayer(raw) } : null;
}

export async function getTeamSquad(teamId: number): Promise<SquadPlayer[]> {
  const response = await apiFootballFetchResponse<RawApiFootballSquad>(
    "/players/squads",
    { team: teamId }
  );
  const raw = response[0];
  return raw ? mapTeamSquad(raw) : [];
}
