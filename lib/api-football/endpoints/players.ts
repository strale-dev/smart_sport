import {
  mapPlayer,
  mapPlayerCareerFromTransfers,
  mapPlayerProfile,
  mapPlayerSeasonStatistics,
  mapSearchPlayer,
  mapTeamSquad,
} from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import { currentFootballSeasonYear } from "@/lib/players/season";
import type {
  RawApiFootballPlayer,
  RawApiFootballPlayerProfile,
  RawApiFootballSearchPlayer,
  RawApiFootballSquad,
  RawApiFootballTransfers,
} from "@/lib/api-football/types";
import type {
  Player,
  PlayerCareerEntry,
  PlayerSeasonStatistics,
  SquadPlayer,
} from "@/types/domain";

export async function getPlayerById(
  id: number,
  season = currentFootballSeasonYear()
): Promise<Player | null> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players",
    { id, season }
  );
  const raw = response[0];
  return raw ? mapPlayer(raw) : null;
}

export async function getPlayerProfileById(id: number): Promise<Player | null> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayerProfile>(
    "/players/profiles",
    { player: id }
  );
  const raw = response[0];
  return raw ? mapPlayerProfile(raw) : null;
}

export async function searchPlayers(query: string): Promise<Player[]> {
  const response = await apiFootballFetchResponse<RawApiFootballSearchPlayer>(
    "/players",
    { search: query }
  );
  return response.map(mapSearchPlayer);
}

export async function getPlayerByIdWithRaw(
  id: number,
  season = currentFootballSeasonYear()
) {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players",
    { id, season }
  );
  const raw = response[0];
  return raw ? { raw, domain: mapPlayer(raw) } : null;
}

export async function getPlayerSeasonStatisticsFromApi(
  id: number,
  season = currentFootballSeasonYear()
): Promise<PlayerSeasonStatistics[]> {
  const response = await apiFootballFetchResponse<RawApiFootballPlayer>(
    "/players",
    { id, season }
  );
  const raw = response[0];
  return raw ? mapPlayerSeasonStatistics(raw) : [];
}

export async function getPlayerTransfers(
  id: number
): Promise<PlayerCareerEntry[]> {
  const response = await apiFootballFetchResponse<RawApiFootballTransfers>(
    "/transfers",
    { player: id }
  );
  const raw = response[0];
  return raw ? mapPlayerCareerFromTransfers(raw) : [];
}

export async function getTeamSquad(teamId: number): Promise<SquadPlayer[]> {
  const response = await apiFootballFetchResponse<RawApiFootballSquad>(
    "/players/squads",
    { team: teamId }
  );
  const raw = response[0];
  return raw ? mapTeamSquad(raw) : [];
}
