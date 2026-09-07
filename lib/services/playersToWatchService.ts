import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeActualImpactScore,
  computePrematchImpactScore,
  pickTopPlayers,
} from "@/lib/players/compute-impact";
import {
  isFixtureAnalyzable,
  resolveFixturePhase,
  type FixturePhase,
} from "@/lib/ai/status-map";
import { readLineupsFromDb } from "@/lib/ingestion/db-read";
import { getFixturePlayers } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

export type PlayersToWatchSource = "predicted" | "actual";

export type PlayerToWatch = {
  playerExternalId: number | null;
  name: string;
  teamExternalId: number;
  teamName: string;
  position: string | null;
  shirtNumber: number | null;
  reason: string;
  score: number;
};

export type PlayersToWatchResult = {
  phase: FixturePhase;
  source: PlayersToWatchSource;
  players: PlayerToWatch[];
};

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

type RecentFormRow = {
  rating: number | null;
  goals: number | null;
  assists: number | null;
};

async function readRecentFormForPlayers(
  playerProviderIds: number[]
): Promise<
  Map<number, { avgRating: number | null; goals: number; assists: number }>
> {
  if (playerProviderIds.length === 0) {
    return new Map();
  }

  const client = createAdminClient();
  const { data: players, error: playersError } = await client
    .from("players")
    .select("id, provider_id")
    .in("provider_id", playerProviderIds);

  if (playersError) {
    throw new Error(`Failed to resolve players: ${playersError.message}`);
  }

  const providerToUuid = new Map(
    (players ?? []).map((row) => [row.provider_id, row.id])
  );

  const summaries = new Map<
    number,
    { avgRating: number | null; goals: number; assists: number }
  >();

  await Promise.all(
    playerProviderIds.map(async (providerId) => {
      const playerUuid = providerToUuid.get(providerId);
      if (!playerUuid) {
        return;
      }

      const { data, error } = await client
        .from("player_match_performances")
        .select(
          `
          rating,
          goals,
          assists,
          fixture:fixtures!inner (status)
        `
        )
        .eq("player_id", playerUuid)
        .in("fixture.status", [...FINISHED_STATUSES])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(
          `Failed to read recent form for player ${providerId}: ${error.message}`
        );
      }

      const rows = (data ?? []) as RecentFormRow[];
      if (rows.length === 0) {
        summaries.set(providerId, { avgRating: null, goals: 0, assists: 0 });
        return;
      }

      const ratings = rows
        .map((row) => (row.rating != null ? Number(row.rating) : null))
        .filter((value): value is number => value != null);
      const goals = rows.reduce((sum, row) => sum + (row.goals ?? 0), 0);
      const assists = rows.reduce((sum, row) => sum + (row.assists ?? 0), 0);
      const avgRating =
        ratings.length > 0
          ? Number(
              (
                ratings.reduce((sum, rating) => sum + rating, 0) /
                ratings.length
              ).toFixed(2)
            )
          : null;

      summaries.set(providerId, { avgRating, goals, assists });
    })
  );

  return summaries;
}

function buildPredictedReason(input: {
  avgRating: number | null;
  goals: number;
  assists: number;
}): string {
  if (input.avgRating != null) {
    return `${input.avgRating.toFixed(1)} avg rating · ${input.goals} goals in last 5`;
  }

  if (input.goals > 0 || input.assists > 0) {
    return `${input.goals} goals and ${input.assists} assists in recent matches`;
  }

  return "Projected starter with lineup impact";
}

function buildActualReason(input: {
  rating: number | null;
  goals: number | null;
  assists: number | null;
}): string {
  if (input.rating != null) {
    const parts = [`${input.rating.toFixed(1)} match rating`];
    if ((input.goals ?? 0) > 0) {
      parts.push(`${input.goals} goal${input.goals === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
  }

  const goals = input.goals ?? 0;
  const assists = input.assists ?? 0;
  if (goals > 0 || assists > 0) {
    return `${goals} goals · ${assists} assists this match`;
  }

  return "Key contribution in this match";
}

async function getPredictedPlayersToWatch(
  fixture: Fixture
): Promise<PlayerToWatch[]> {
  const lineups = await readLineupsFromDb(fixture.externalId);
  if (lineups.length === 0) {
    return [];
  }

  const teamNameByExternalId = new Map<number, string>([
    [fixture.homeTeam.externalId, fixture.homeTeam.name],
    [fixture.awayTeam.externalId, fixture.awayTeam.name],
  ]);

  const starters = lineups.flatMap((lineup) =>
    lineup.players
      .filter((player) => player.isStarting && player.playerExternalId != null)
      .map((player) => ({
        playerExternalId: player.playerExternalId!,
        name: player.name,
        teamExternalId: lineup.teamExternalId,
        position: player.position,
        shirtNumber: player.shirtNumber,
        isCaptain: player.isCaptain,
      }))
  );

  if (starters.length === 0) {
    return [];
  }

  const recentForm = await readRecentFormForPlayers(
    starters.map((player) => player.playerExternalId)
  );

  const scored = starters.map((player) => {
    const form = recentForm.get(player.playerExternalId) ?? {
      avgRating: null,
      goals: 0,
      assists: 0,
    };

    const score = computePrematchImpactScore({
      avgRating: form.avgRating,
      goals: form.goals,
      assists: form.assists,
      position: player.position,
      isCaptain: player.isCaptain,
    });

    return {
      playerExternalId: player.playerExternalId,
      name: player.name,
      teamExternalId: player.teamExternalId,
      teamName: teamNameByExternalId.get(player.teamExternalId) ?? "Team",
      position: player.position,
      shirtNumber: player.shirtNumber,
      reason: buildPredictedReason(form),
      score,
    };
  });

  return pickTopPlayers(scored, 3, 2);
}

async function getActualPlayersToWatch(
  fixture: Fixture
): Promise<PlayerToWatch[]> {
  const { data: performances } = await getFixturePlayers(fixture.externalId);
  if (!performances || performances.length === 0) {
    return [];
  }

  const teamNameByExternalId = new Map<number, string>([
    [fixture.homeTeam.externalId, fixture.homeTeam.name],
    [fixture.awayTeam.externalId, fixture.awayTeam.name],
  ]);

  const scored = performances.map((performance) => ({
    playerExternalId: performance.playerExternalId,
    name: performance.name,
    teamExternalId: performance.teamExternalId,
    teamName: teamNameByExternalId.get(performance.teamExternalId) ?? "Team",
    position: performance.position,
    shirtNumber: performance.shirtNumber,
    reason: buildActualReason({
      rating: performance.rating,
      goals: performance.goals,
      assists: performance.assists,
    }),
    score: computeActualImpactScore({
      rating: performance.rating,
      goals: performance.goals,
      assists: performance.assists,
    }),
  }));

  return pickTopPlayers(scored, 3, 2);
}

export async function getPlayersToWatch(
  fixture: Fixture
): Promise<PlayersToWatchResult> {
  const phase = resolveFixturePhase(fixture.status);

  if (!isFixtureAnalyzable(fixture.status)) {
    return { phase, source: "predicted", players: [] };
  }

  if (phase === "PREMATCH") {
    return {
      phase,
      source: "predicted",
      players: await getPredictedPlayersToWatch(fixture),
    };
  }

  return {
    phase,
    source: "actual",
    players: await getActualPlayersToWatch(fixture),
  };
}
