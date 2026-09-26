import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

type AdminClient = ReturnType<typeof createAdminClient>;

export type LeagueSeasonSyncStatus =
  "pending" | "complete" | "failed" | "skipped";

export async function getLeagueSeasonSyncState(
  leagueProviderId: number,
  seasonYear: number
): Promise<{
  status: LeagueSeasonSyncStatus;
  fixturesUpserted: number;
} | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ingestion_league_season_state")
    .select("status, fixtures_upserted")
    .eq("league_provider_id", leagueProviderId)
    .eq("season_year", seasonYear)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to read league-season sync state: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    status: data.status as LeagueSeasonSyncStatus,
    fixturesUpserted: data.fixtures_upserted ?? 0,
  };
}

export async function upsertLeagueSeasonSyncState(
  client: AdminClient,
  row: {
    leagueProviderId: number;
    seasonYear: number;
    fixturesUpserted: number;
    apiRequests: number;
    status: LeagueSeasonSyncStatus;
    errorMessage?: string | null;
  }
): Promise<void> {
  const { error } = await client.from("ingestion_league_season_state").upsert(
    {
      league_provider_id: row.leagueProviderId,
      season_year: row.seasonYear,
      last_sync_at: new Date().toISOString(),
      fixtures_upserted: row.fixturesUpserted,
      api_requests: row.apiRequests,
      status: row.status,
      error_message: row.errorMessage ?? null,
    },
    { onConflict: "league_provider_id,season_year" }
  );

  if (error) {
    throw new Error(
      `Failed to upsert league-season sync state: ${error.message}`
    );
  }
}

export async function startIngestionSyncRun(
  jobName: string,
  tier?: number
): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ingestion_sync_runs")
    .insert({
      job_name: jobName,
      tier: tier ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to start ingestion sync run: ${error.message}`);
  }

  return data.id;
}

export async function finishIngestionSyncRun(
  runId: string,
  outcome: {
    status: "complete" | "failed";
    stats: Record<string, unknown>;
    errorMessage?: string;
  }
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client
    .from("ingestion_sync_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: outcome.status,
      stats: outcome.stats as Json,
      error_message: outcome.errorMessage ?? null,
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to finish ingestion sync run: ${error.message}`);
  }
}
