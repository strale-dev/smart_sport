import { cookies } from "next/headers";

import { EntityNotFoundError, mapFollowInsertError } from "@/lib/follow/errors";
import {
  readFixtureIdByProviderIdFromDb,
  readLeagueIdByProviderIdFromDb,
  readPlayerIdByProviderIdFromDb,
  readTeamIdByProviderIdFromDb,
} from "@/lib/ingestion/db-read";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type FollowObjectType = Database["public"]["Enums"]["follow_object"];

export type FollowedTeamItem = {
  followId: string;
  providerId: number;
  name: string;
  logoUrl: string | null;
};

export type FollowedPlayerItem = {
  followId: string;
  providerId: number;
  fullName: string;
  photoUrl: string | null;
};

export type FollowedLeagueItem = {
  followId: string;
  providerId: number;
  name: string;
  logoUrl: string | null;
};

export type UserFollowsDashboard = {
  teams: FollowedTeamItem[];
  players: FollowedPlayerItem[];
  leagues: FollowedLeagueItem[];
};

export type FollowProviderTarget = {
  objectType: FollowObjectType;
  providerId: number;
};

async function getUserSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function resolveEntityUuid(
  objectType: FollowObjectType,
  providerId: number
): Promise<string> {
  let entityId: string | null = null;

  if (objectType === "TEAM") {
    entityId = await readTeamIdByProviderIdFromDb(providerId);
  } else if (objectType === "PLAYER") {
    entityId = await readPlayerIdByProviderIdFromDb(providerId);
  } else {
    entityId = await readLeagueIdByProviderIdFromDb(providerId);
  }

  if (!entityId) {
    throw new EntityNotFoundError();
  }

  return entityId;
}

function buildFollowInsertRow(
  userId: string,
  objectType: FollowObjectType,
  entityId: string
): Database["public"]["Tables"]["follows"]["Insert"] {
  if (objectType === "TEAM") {
    return {
      user_id: userId,
      object_type: "TEAM",
      team_id: entityId,
      player_id: null,
      league_id: null,
    };
  }

  if (objectType === "PLAYER") {
    return {
      user_id: userId,
      object_type: "PLAYER",
      player_id: entityId,
      team_id: null,
      league_id: null,
    };
  }

  return {
    user_id: userId,
    object_type: "LEAGUE",
    league_id: entityId,
    team_id: null,
    player_id: null,
  };
}

export async function isFollowingProvider(
  userId: string,
  target: FollowProviderTarget
): Promise<boolean> {
  const entityId = await resolveEntityUuid(
    target.objectType,
    target.providerId
  );
  const supabase = await getUserSupabase();

  let query = supabase
    .from("follows")
    .select("id")
    .eq("user_id", userId)
    .eq("object_type", target.objectType);

  if (target.objectType === "TEAM") {
    query = query.eq("team_id", entityId);
  } else if (target.objectType === "PLAYER") {
    query = query.eq("player_id", entityId);
  } else {
    query = query.eq("league_id", entityId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to read follow state: ${error.message}`);
  }

  return Boolean(data);
}

export async function isFixtureFavorited(
  userId: string,
  fixtureProviderId: number
): Promise<boolean> {
  const fixtureId = await readFixtureIdByProviderIdFromDb(fixtureProviderId);

  if (!fixtureId) {
    return false;
  }

  const supabase = await getUserSupabase();
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("fixture_id", fixtureId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read favorite state: ${error.message}`);
  }

  return Boolean(data);
}

export async function listUserFollows(
  userId: string
): Promise<UserFollowsDashboard> {
  const supabase = await getUserSupabase();

  const { data, error } = await supabase
    .from("follows")
    .select(
      `
      id,
      object_type,
      team:teams!follows_team_id_fkey ( provider_id, name, logo_url ),
      player:players!follows_player_id_fkey ( provider_id, full_name, photo_url ),
      league:leagues!follows_league_id_fkey ( provider_id, name, logo_url )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list follows: ${error.message}`);
  }

  const teams: FollowedTeamItem[] = [];
  const players: FollowedPlayerItem[] = [];
  const leagues: FollowedLeagueItem[] = [];

  for (const row of data ?? []) {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    const player = Array.isArray(row.player) ? row.player[0] : row.player;
    const league = Array.isArray(row.league) ? row.league[0] : row.league;

    if (row.object_type === "TEAM" && team) {
      teams.push({
        followId: row.id,
        providerId: team.provider_id,
        name: team.name,
        logoUrl: team.logo_url,
      });
    } else if (row.object_type === "PLAYER" && player) {
      players.push({
        followId: row.id,
        providerId: player.provider_id,
        fullName: player.full_name,
        photoUrl: player.photo_url,
      });
    } else if (row.object_type === "LEAGUE" && league) {
      leagues.push({
        followId: row.id,
        providerId: league.provider_id,
        name: league.name,
        logoUrl: league.logo_url,
      });
    }
  }

  return { teams, players, leagues };
}

export async function followEntity(
  userId: string,
  target: FollowProviderTarget
): Promise<void> {
  const entityId = await resolveEntityUuid(
    target.objectType,
    target.providerId
  );
  const supabase = await getUserSupabase();
  const row = buildFollowInsertRow(userId, target.objectType, entityId);

  const { error } = await supabase.from("follows").insert(row);

  if (error) {
    throw mapFollowInsertError(error);
  }
}

export async function unfollowEntity(
  userId: string,
  target: FollowProviderTarget
): Promise<void> {
  const entityId = await resolveEntityUuid(
    target.objectType,
    target.providerId
  );
  const supabase = await getUserSupabase();

  let query = supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("object_type", target.objectType);

  if (target.objectType === "TEAM") {
    query = query.eq("team_id", entityId);
  } else if (target.objectType === "PLAYER") {
    query = query.eq("player_id", entityId);
  } else {
    query = query.eq("league_id", entityId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to unfollow: ${error.message}`);
  }
}

export async function favoriteFixture(
  userId: string,
  fixtureProviderId: number
): Promise<void> {
  const fixtureId = await readFixtureIdByProviderIdFromDb(fixtureProviderId);

  if (!fixtureId) {
    throw new EntityNotFoundError();
  }

  const supabase = await getUserSupabase();
  const { error } = await supabase.from("favorites").insert({
    user_id: userId,
    fixture_id: fixtureId,
  });

  if (error) {
    throw new Error(`Failed to favorite fixture: ${error.message}`);
  }
}

export async function unfavoriteFixture(
  userId: string,
  fixtureProviderId: number
): Promise<void> {
  const fixtureId = await readFixtureIdByProviderIdFromDb(fixtureProviderId);

  if (!fixtureId) {
    return;
  }

  const supabase = await getUserSupabase();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("fixture_id", fixtureId);

  if (error) {
    throw new Error(`Failed to unfavorite fixture: ${error.message}`);
  }
}
