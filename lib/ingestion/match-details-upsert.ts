import {
  fixtureEventToInsert,
  fixtureStatisticsToInsert,
  lineupPlayerToInsert,
  lineupToInsert,
  playerToInsert,
} from "@/lib/api-football/to-db";
import { squadPlayerToDomainPlayer } from "@/lib/players/from-squad";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  FixtureTeamStatistics,
  Lineup,
  Player,
  SquadPlayer,
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

export async function getFixtureLeagueProviderId(
  client: AdminClient,
  fixtureProviderId: number
): Promise<number | null> {
  const { data, error } = await client
    .from("fixtures")
    .select("leagues ( provider_id )")
    .eq("provider_id", fixtureProviderId)
    .maybeSingle();

  throwIfError(
    error,
    `Failed to resolve league for fixture ${fixtureProviderId}`
  );

  const league = data?.leagues as { provider_id: number } | null | undefined;
  return league?.provider_id ?? null;
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

export async function upsertPlayerProfile(
  client: AdminClient,
  player: Player
): Promise<string | null> {
  const insert = playerToInsert(player);
  const { data, error } = await client
    .from("players")
    .upsert(
      {
        provider_id: insert.provider_id,
        first_name: insert.first_name,
        last_name: insert.last_name,
        full_name: insert.full_name,
        nationality: insert.nationality,
        date_of_birth: insert.date_of_birth,
        height_cm: insert.height_cm,
        weight_kg: insert.weight_kg,
        position: insert.position,
        preferred_foot: insert.preferred_foot,
        photo_url: insert.photo_url,
        provider_payload: asDbJson(insert.provider_payload),
      },
      { onConflict: "provider_id" }
    )
    .select("id")
    .single();

  throwIfError(error, `Failed to upsert player profile ${player.externalId}`);
  const playerId = data?.id ?? null;

  if (playerId && player.currentTeam) {
    const teamId = await getTeamUuidByProviderId(
      client,
      player.currentTeam.externalId
    );
    if (teamId) {
      await upsertCurrentClub(client, playerId, teamId, player.shirtNumber);
    }
  }

  return playerId;
}

async function upsertCurrentClub(
  client: AdminClient,
  playerId: string,
  teamId: string,
  shirtNumber: number | null
): Promise<void> {
  const { data: current, error: currentError } = await client
    .from("player_team_history")
    .select("id, team_id")
    .eq("player_id", playerId)
    .is("left_on", null)
    .maybeSingle();

  throwIfError(currentError, "Failed to read current club");

  if (current?.team_id === teamId) {
    const { error } = await client
      .from("player_team_history")
      .update({ shirt_number: shirtNumber })
      .eq("id", current.id);
    throwIfError(error, "Failed to update current club");
    return;
  }

  if (current) {
    const { error } = await client
      .from("player_team_history")
      .update({ left_on: new Date().toISOString().slice(0, 10) })
      .eq("id", current.id);
    throwIfError(error, "Failed to close previous club");
  }

  const { error } = await client.from("player_team_history").insert({
    player_id: playerId,
    team_id: teamId,
    shirt_number: shirtNumber,
    left_on: null,
  });
  throwIfError(error, "Failed to insert current club");
}

export async function upsertSquadPlayers(
  teamProviderId: number,
  squad: SquadPlayer[]
): Promise<void> {
  if (squad.length === 0) {
    return;
  }

  const client = createAdminClient();
  const teamId = await getTeamUuidByProviderId(client, teamProviderId);
  const { data: teamRow } = teamId
    ? await client
        .from("teams")
        .select("name, code, logo_url, is_national")
        .eq("id", teamId)
        .maybeSingle()
    : { data: null };

  const teamRef = teamId
    ? {
        externalId: teamProviderId,
        name: teamRow?.name ?? "Unknown",
        code: teamRow?.code ?? null,
        logoUrl: teamRow?.logo_url ?? null,
        isNational: teamRow?.is_national ?? false,
      }
    : null;

  await Promise.all(
    squad.map((member) =>
      upsertPlayerProfile(client, squadPlayerToDomainPlayer(member, teamRef))
    )
  );
}

export async function persistPlayerProfile(player: Player): Promise<void> {
  const client = createAdminClient();
  await upsertPlayerProfile(client, player);
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
        event.playerName ?? null
      );
      const assistPlayerId = await upsertPlayerRef(
        client,
        event.assistPlayerExternalId,
        event.assistPlayerName ?? null
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
          coach_provider_id: insert.coach_provider_id,
          coach_photo_url: insert.coach_photo_url,
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

export async function upsertPlayerMatchPerformances(
  client: AdminClient,
  fixtureId: string,
  performances: FixturePlayerPerformance[]
): Promise<number> {
  const { error: deleteError } = await client
    .from("player_match_performances")
    .delete()
    .eq("fixture_id", fixtureId);

  throwIfError(deleteError, "Failed to clear player match performances");

  if (performances.length === 0) {
    return 0;
  }

  const rows = (
    await Promise.all(
      performances.map(async (performance) => {
        const playerId = await upsertPlayerRef(
          client,
          performance.playerExternalId,
          performance.name
        );
        const teamId = await getTeamUuidByProviderId(
          client,
          performance.teamExternalId
        );

        if (!playerId) {
          return null;
        }

        return {
          fixture_id: fixtureId,
          player_id: playerId,
          team_id: teamId,
          minutes: performance.minutes,
          rating: performance.rating,
          goals: performance.goals ?? 0,
          assists: performance.assists ?? 0,
          shots_total: performance.shotsTotal ?? 0,
          shots_on_target: performance.shotsOnTarget ?? 0,
          passes: performance.passes ?? 0,
          key_passes: performance.keyPasses ?? 0,
          yellow_cards: performance.yellowCards ?? 0,
          red_cards: performance.redCards ?? 0,
          saves: performance.saves ?? 0,
          was_captain: performance.wasCaptain,
          was_starter: performance.wasStarter,
          is_motm: false,
          provider_payload: asDbJson(performance),
        };
      })
    )
  ).filter((row): row is NonNullable<typeof row> => row != null);

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await client.from("player_match_performances").insert(rows);
  throwIfError(error, "Failed to insert player match performances");
  return rows.length;
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

  if ((count ?? 0) === 0) {
    return false;
  }

  // Every provider event names a player, so a set with no linkage at all is a
  // partial ingest rather than real data — treat it as missing so it re-ingests.
  const { count: linkedCount, error: linkedError } = await client
    .from("fixture_events")
    .select("*", { count: "exact", head: true })
    .eq("fixture_id", fixtureId)
    .not("player_id", "is", null);

  throwIfError(linkedError, "Failed to check fixture event player linkage");
  return (linkedCount ?? 0) > 0;
}

export async function fixtureHasPlayerPerformances(
  client: AdminClient,
  fixtureId: string
): Promise<boolean> {
  const { count, error } = await client
    .from("player_match_performances")
    .select("*", { count: "exact", head: true })
    .eq("fixture_id", fixtureId);

  throwIfError(error, "Failed to check player match performances");
  return (count ?? 0) > 0;
}

export async function upsertFixtureSidelined(
  client: AdminClient,
  fixtureId: string,
  sidelined: FixtureSidelinedPlayer[]
): Promise<number> {
  const { error: deleteError } = await client
    .from("fixture_sidelined_players")
    .delete()
    .eq("fixture_id", fixtureId);

  throwIfError(deleteError, "Failed to clear fixture sidelined players");

  if (sidelined.length === 0) {
    return 0;
  }

  const rows = await Promise.all(
    sidelined.map(async (entry) => {
      const teamId = await getTeamUuidByProviderId(
        client,
        entry.teamExternalId
      );
      if (!teamId) {
        return null;
      }

      const playerId = entry.playerExternalId
        ? await upsertPlayerRef(client, entry.playerExternalId, entry.name)
        : null;

      return {
        fixture_id: fixtureId,
        team_id: teamId,
        player_id: playerId,
        player_provider_id: entry.playerExternalId,
        player_name: entry.name,
        kind: entry.kind,
        reason: entry.reason,
        provider_payload: asDbJson({
          kind: entry.kind,
          reason: entry.reason,
        }),
      };
    })
  );

  const insertRows = rows.filter(
    (row): row is NonNullable<(typeof rows)[number]> => row != null
  );

  if (insertRows.length === 0) {
    return 0;
  }

  const { error: insertError } = await client
    .from("fixture_sidelined_players")
    .insert(insertRows);

  throwIfError(insertError, "Failed to insert fixture sidelined players");
  return insertRows.length;
}

export async function fixtureHasLineups(
  client: AdminClient,
  fixtureId: string
): Promise<boolean> {
  const { count, error } = await client
    .from("lineups")
    .select("*", { count: "exact", head: true })
    .eq("fixture_id", fixtureId);

  throwIfError(error, "Failed to check lineups");
  return (count ?? 0) > 0;
}

export const LINEUP_SYNC_COMPLETE_STARTERS = 11;
export const LINEUP_SYNC_FINAL_POLL_MINUTES = 60;

export type LineupSyncTeamSnapshot = {
  startingCount: number;
};

export type LineupSyncDbSnapshot = {
  teams: LineupSyncTeamSnapshot[];
};

/** Pure helper: true when provider lineups should be fetched for this fixture. */
export function evaluateLineupSyncNeed(
  snapshot: LineupSyncDbSnapshot,
  kickoffAt: string | Date,
  now: Date = new Date(),
  finalPollMinutes = LINEUP_SYNC_FINAL_POLL_MINUTES,
  completeStarterThreshold = LINEUP_SYNC_COMPLETE_STARTERS
): boolean {
  const kickoffMs =
    kickoffAt instanceof Date ? kickoffAt.getTime() : Date.parse(kickoffAt);
  const minutesToKickoff = (kickoffMs - now.getTime()) / 60_000;

  if (minutesToKickoff <= finalPollMinutes) {
    return true;
  }

  const completeTeams = snapshot.teams.filter(
    (team) => team.startingCount >= completeStarterThreshold
  ).length;

  return completeTeams < 2;
}

type LineupPlayerStartingRow = {
  is_starting: boolean;
};

type LineupSyncRow = {
  lineup_players: LineupPlayerStartingRow[] | null;
};

export async function loadLineupSyncSnapshot(
  client: AdminClient,
  fixtureId: string
): Promise<LineupSyncDbSnapshot> {
  const { data, error } = await client
    .from("lineups")
    .select(
      `
      lineup_players (
        is_starting
      )
    `
    )
    .eq("fixture_id", fixtureId);

  throwIfError(error, "Failed to load lineups for sync need");

  const teams = ((data ?? []) as LineupSyncRow[]).map((row) => ({
    startingCount: (row.lineup_players ?? []).filter(
      (player) => player.is_starting
    ).length,
  }));

  return { teams };
}

export async function fixtureNeedsLineupSync(
  client: AdminClient,
  fixtureId: string,
  kickoffAt: string,
  now: Date = new Date()
): Promise<boolean> {
  const snapshot = await loadLineupSyncSnapshot(client, fixtureId);
  return evaluateLineupSyncNeed(snapshot, kickoffAt, now);
}
