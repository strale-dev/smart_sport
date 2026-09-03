import {
  fixtureEventToInsert,
  fixtureStatisticsToInsert,
  lineupPlayerToInsert,
  lineupToInsert,
} from "@/lib/api-football/to-db";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FixtureEvent,
  FixtureTeamStatistics,
  Lineup,
} from "@/types/domain";
import type { Json } from "@/types/supabase";

type AdminClient = ReturnType<typeof createAdminClient>;

function throwIfError(
  error: { message: string } | null,
  context: string
): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function asDbJson(value: unknown): Json {
  return value as Json;
}

export async function getFixtureUuidByProviderId(
  client: AdminClient,
  providerId: number
): Promise<string | null> {
  const { data, error } = await client
    .from("fixtures")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  throwIfError(error, `Failed to resolve fixture uuid for ${providerId}`);
  return data?.id ?? null;
}

export async function getTeamUuidByProviderId(
  client: AdminClient,
  providerId: number
): Promise<string | null> {
  const { data, error } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  throwIfError(error, `Failed to resolve team uuid for ${providerId}`);
  return data?.id ?? null;
}

export async function upsertPlayerRef(
  client: AdminClient,
  providerId: number | null,
  name: string | null
): Promise<string | null> {
  if (!providerId || !name?.trim()) {
    return null;
  }

  const { data, error } = await client
    .from("players")
    .upsert(
      {
        provider_id: providerId,
        full_name: name.trim(),
        first_name: null,
        last_name: null,
        preferred_foot: "UNKNOWN",
      },
      { onConflict: "provider_id" }
    )
    .select("id")
    .single();

  throwIfError(error, `Failed to upsert player ${providerId}`);
  return data?.id ?? null;
}

export async function upsertFixtureEvents(
  client: AdminClient,
  fixtureId: string,
  events: FixtureEvent[]
): Promise<number> {
  const { error: deleteError } = await client
    .from("fixture_events")
    .delete()
    .eq("fixture_id", fixtureId);

  throwIfError(deleteError, "Failed to clear fixture events");

  if (events.length === 0) {
    return 0;
  }

  const rows = await Promise.all(
    events.map(async (event) => {
      const teamId = event.teamExternalId
        ? await getTeamUuidByProviderId(client, event.teamExternalId)
        : null;
      const playerId = await upsertPlayerRef(
        client,
        event.playerExternalId,
        null
      );
      const assistPlayerId = await upsertPlayerRef(
        client,
        event.assistPlayerExternalId,
        null
      );

      const insert = fixtureEventToInsert(event);
      return {
        fixture_id: fixtureId,
        provider_event_id: insert.provider_event_id,
        minute: insert.minute,
        extra_minute: insert.extra_minute,
        team_id: teamId,
        player_id: playerId,
        assist_player_id: assistPlayerId,
        type: insert.type,
        detail: insert.detail,
        comments: insert.comments,
        provider_payload: asDbJson(insert.provider_payload),
      };
    })
  );

  const { error } = await client.from("fixture_events").insert(rows);
  throwIfError(error, "Failed to insert fixture events");
  return rows.length;
}

export async function upsertFixtureStatistics(
  client: AdminClient,
  fixtureId: string,
  stats: FixtureTeamStatistics[]
): Promise<number> {
  let upserted = 0;

  for (const stat of stats) {
    const teamId = await getTeamUuidByProviderId(client, stat.teamExternalId);
    if (!teamId) {
      continue;
    }

    const insert = fixtureStatisticsToInsert(stat);
    const { error } = await client.from("fixture_statistics").upsert(
      {
        fixture_id: fixtureId,
        team_id: teamId,
        ...insert,
        provider_payload: asDbJson(insert.provider_payload),
      },
      { onConflict: "fixture_id,team_id" }
    );

    throwIfError(error, "Failed to upsert fixture statistics");
    upserted += 1;
  }

  return upserted;
}

export async function upsertLineups(
  client: AdminClient,
  fixtureId: string,
  lineups: Lineup[]
): Promise<number> {
  let upserted = 0;

  for (const lineup of lineups) {
    const teamId = await getTeamUuidByProviderId(client, lineup.teamExternalId);
    if (!teamId) {
      continue;
    }

    const insert = lineupToInsert(lineup);
    const { data: lineupRow, error: lineupError } = await client
      .from("lineups")
      .upsert(
        {
          fixture_id: fixtureId,
          team_id: teamId,
          formation: insert.formation,
          coach_name: insert.coach_name,
          is_confirmed: insert.is_confirmed,
          provider_payload: asDbJson(insert.provider_payload),
        },
        { onConflict: "fixture_id,team_id" }
      )
      .select("id")
      .single();

    throwIfError(lineupError, "Failed to upsert lineup");

    if (!lineupRow?.id) {
      continue;
    }

    const { error: deletePlayersError } = await client
      .from("lineup_players")
      .delete()
      .eq("lineup_id", lineupRow.id);

    throwIfError(deletePlayersError, "Failed to clear lineup players");

    if (lineup.players.length === 0) {
      upserted += 1;
      continue;
    }

    const playerRows = await Promise.all(
      lineup.players.map(async (player) => {
        const playerId = await upsertPlayerRef(
          client,
          player.playerExternalId,
          player.name
        );
        const playerInsert = lineupPlayerToInsert(player);

        return {
          lineup_id: lineupRow.id,
          player_id: playerId,
          shirt_number: playerInsert.shirt_number,
          position: playerInsert.position,
          grid: playerInsert.grid,
          is_starting: playerInsert.is_starting,
          is_captain: playerInsert.is_captain,
          provider_payload: asDbJson({
            name: player.name,
            ...playerInsert.provider_payload,
          }),
        };
      })
    );

    const { error: playersError } = await client
      .from("lineup_players")
      .insert(playerRows);

    throwIfError(playersError, "Failed to insert lineup players");
    upserted += 1;
  }

  return upserted;
}

export async function fixtureHasMatchDetails(
  client: AdminClient,
  fixtureId: string
): Promise<boolean> {
  const { count, error } = await client
    .from("fixture_events")
    .select("*", { count: "exact", head: true })
    .eq("fixture_id", fixtureId);

  throwIfError(error, "Failed to check fixture events");
  return (count ?? 0) > 0;
}
