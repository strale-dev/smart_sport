import {
  evaluateTeamHistoryCompletenessByScopes,
  type TeamHistoryCompleteness,
} from "@/lib/analytics/team-history-query";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

export type TeamSyncStateRow = {
  teamProviderId: number;
  finishedCount: number;
  upcomingCount: number;
  lastGapFillAt: string | null;
  seasonsCovered: number;
  lastRepairSeasonYear: number | null;
  minFinishedTarget: number;
  historyState: TeamHistoryCompleteness[] | null;
  updatedAt: string;
};

export async function getTeamSyncState(
  teamProviderId: number
): Promise<TeamSyncStateRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ingestion_team_sync_state")
    .select("*")
    .eq("team_provider_id", teamProviderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read team sync state: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapRow(data);
}

function mapRow(data: {
  team_provider_id: number;
  finished_count: number;
  upcoming_count: number;
  last_gap_fill_at: string | null;
  seasons_covered: number;
  last_repair_season_year: number | null;
  min_finished_target: number;
  history_state: Json | null;
  updated_at: string;
}): TeamSyncStateRow {
  return {
    teamProviderId: data.team_provider_id,
    finishedCount: data.finished_count,
    upcomingCount: data.upcoming_count,
    lastGapFillAt: data.last_gap_fill_at,
    seasonsCovered: data.seasons_covered,
    lastRepairSeasonYear: data.last_repair_season_year,
    minFinishedTarget: data.min_finished_target,
    historyState: parseHistoryState(data.history_state),
    updatedAt: data.updated_at,
  };
}

function parseHistoryState(
  value: Json | null
): TeamHistoryCompleteness[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value as TeamHistoryCompleteness[];
}

export async function upsertTeamSyncState(input: {
  teamProviderId: number;
  finishedCount: number;
  upcomingCount?: number;
  seasonsCovered?: number;
  lastRepairSeasonYear?: number | null;
  minFinishedTarget?: number;
  historyState?: TeamHistoryCompleteness[] | null;
  touchGapFill?: boolean;
}): Promise<void> {
  const client = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await client.from("ingestion_team_sync_state").upsert(
    {
      team_provider_id: input.teamProviderId,
      finished_count: input.finishedCount,
      upcoming_count: input.upcomingCount ?? 0,
      seasons_covered: input.seasonsCovered ?? 0,
      last_repair_season_year: input.lastRepairSeasonYear ?? null,
      min_finished_target: input.minFinishedTarget ?? 30,
      history_state: (input.historyState ?? null) as Json,
      updated_at: now,
      ...(input.touchGapFill ? { last_gap_fill_at: now } : {}),
    },
    { onConflict: "team_provider_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert team sync state: ${error.message}`);
  }
}

export async function listTeamsBelowHistoryTarget(input: {
  teamProviderIds: number[];
  minFinished?: number;
}): Promise<number[]> {
  if (input.teamProviderIds.length === 0) {
    return [];
  }

  const minFinished = input.minFinished ?? 30;
  const client = createAdminClient();
  const { data, error } = await client
    .from("ingestion_team_sync_state")
    .select("team_provider_id, finished_count")
    .in("team_provider_id", input.teamProviderIds);

  if (error) {
    throw new Error(`Failed to list team sync states: ${error.message}`);
  }

  const byId = new Map(
    (data ?? []).map((row) => [row.team_provider_id, row.finished_count])
  );

  return input.teamProviderIds.filter((teamProviderId) => {
    const count = byId.get(teamProviderId);
    return count == null || count < minFinished;
  });
}

export async function refreshTeamSyncStateFromDb(input: {
  teamProviderId: number;
  teamUuid: string;
  beforeAt?: string;
}): Promise<TeamSyncStateRow> {
  const beforeAt = input.beforeAt ?? new Date().toISOString();
  const client = createAdminClient();

  const finishedCount = await countUpcomingAndFinished(
    client,
    input.teamUuid,
    beforeAt
  );

  const historyState = await evaluateTeamHistoryCompletenessByScopes({
    teamUuid: input.teamUuid,
    beforeAt,
  });

  await upsertTeamSyncState({
    teamProviderId: input.teamProviderId,
    finishedCount: finishedCount.finished,
    upcomingCount: finishedCount.upcoming,
    historyState,
  });

  const row = await getTeamSyncState(input.teamProviderId);
  if (!row) {
    throw new Error(
      `Team sync state missing after refresh for ${input.teamProviderId}`
    );
  }

  return row;
}

async function countUpcomingAndFinished(
  client: ReturnType<typeof createAdminClient>,
  teamUuid: string,
  beforeAt: string
): Promise<{ finished: number; upcoming: number }> {
  const { count: finished, error: finishedError } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .or(`home_team_id.eq.${teamUuid},away_team_id.eq.${teamUuid}`)
    .in("status", ["FT", "AET", "PEN"])
    .lt("kickoff_at", beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null);

  if (finishedError) {
    throw new Error(
      `Failed to count finished fixtures: ${finishedError.message}`
    );
  }

  const { count: upcoming, error: upcomingError } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .or(`home_team_id.eq.${teamUuid},away_team_id.eq.${teamUuid}`)
    .gte("kickoff_at", beforeAt);

  if (upcomingError) {
    throw new Error(
      `Failed to count upcoming fixtures: ${upcomingError.message}`
    );
  }

  return {
    finished: finished ?? 0,
    upcoming: upcoming ?? 0,
  };
}
