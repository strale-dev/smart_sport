import { competitionSupportsLineups } from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import { createCronIngestBudget } from "@/lib/ingestion/cron-budget";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { shouldRunNonCriticalIngestion } from "@/lib/ingestion/schedule";
import { fixtureNeedsLineupSync } from "@/lib/ingestion/match-details-upsert";
import { createAdminClient } from "@/lib/supabase/admin";

export const LINEUP_SYNC_WINDOW_MS = 90 * 60_000;

const PRE_MATCH_STATUSES = ["NS", "TBD"] as const;

export type SyncLineupsResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  degraded?: boolean;
  reason?: string;
  stats?: {
    candidates: number;
    synced: number;
    skippedComplete: number;
    errors: number;
    apiRequests: number;
    leaguesRequested: number;
    leaguesWithLineups: number;
    leaguesSkippedNoLineups: number;
    nonCriticalSkipped?: boolean;
    stoppedForTimeBudget?: boolean;
    candidatesRemaining?: number;
  };
};

export async function syncLineups(): Promise<SyncLineupsResult> {
  const config = getIngestionConfig();

  if (!config.lineupsSyncEnabled) {
    return {
      ok: true,
      job: "sync-lineups",
      skipped: true,
      reason:
        "Lineups sync is disabled. In development set API_FOOTBALL_LINEUPS_SYNC_ENABLED=true; in production unset the flag or set true (use false as kill-switch before Pro cutover).",
    };
  }

  if (!(await shouldRunNonCriticalIngestion())) {
    return {
      ok: true,
      job: "sync-lineups",
      skipped: true,
      reason: "API quota below non-critical ingestion threshold.",
      stats: {
        candidates: 0,
        synced: 0,
        skippedComplete: 0,
        errors: 0,
        apiRequests: 0,
        leaguesRequested: config.leagueProviderIds.length,
        leaguesWithLineups: 0,
        leaguesSkippedNoLineups: 0,
        nonCriticalSkipped: true,
      },
    };
  }

  const client = createAdminClient();
  const batchSize = config.lineupsSyncBatch;
  const now = Date.now();
  const windowEnd = new Date(now + LINEUP_SYNC_WINDOW_MS).toISOString();
  const windowStart = new Date(now).toISOString();

  const lineupLeagueProviderIds = config.leagueProviderIds.filter((id) =>
    competitionSupportsLineups(findCompetition(id))
  );
  const leaguesSkippedNoLineups =
    config.leagueProviderIds.length - lineupLeagueProviderIds.length;

  const { data: leagues, error: leaguesError } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...lineupLeagueProviderIds]);

  if (leaguesError) {
    throw new Error(`Failed to load leagues: ${leaguesError.message}`);
  }

  if (!leagues?.length) {
    return {
      ok: true,
      job: "sync-lineups",
      skipped: true,
      reason: "No allowlist leagues in database.",
      stats: {
        candidates: 0,
        synced: 0,
        skippedComplete: 0,
        errors: 0,
        apiRequests: 0,
        leaguesRequested: config.leagueProviderIds.length,
        leaguesWithLineups: lineupLeagueProviderIds.length,
        leaguesSkippedNoLineups,
      },
    };
  }

  const leagueIds = leagues.map((league) => league.id);

  const { data: fixtures, error: fixturesError } = await client
    .from("fixtures")
    .select("id, provider_id, kickoff_at")
    .in("league_id", leagueIds)
    .in("status", [...PRE_MATCH_STATUSES])
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd)
    .order("kickoff_at", { ascending: true })
    .limit(batchSize);

  if (fixturesError) {
    throw new Error(`Failed to load fixtures: ${fixturesError.message}`);
  }

  const candidates = fixtures ?? [];
  let synced = 0;
  let skippedComplete = 0;
  let errors = 0;
  let apiRequests = 0;
  let stoppedForTimeBudget = false;
  let processed = 0;
  const budget = createCronIngestBudget(Date.now());

  for (const fixture of candidates) {
    if (budget.exceeded()) {
      stoppedForTimeBudget = true;
      logIngestionEvent({
        job_name: "sync-lineups",
        stage: "budget_stop",
        error_type: "budget_exceeded",
        ok: true,
        degraded: true,
        reason: "Stopped candidate loop for wall-clock budget",
        detail: {
          processed,
          candidatesRemaining: candidates.length - processed,
        },
      });
      break;
    }

    processed += 1;

    try {
      const needsSync = await fixtureNeedsLineupSync(
        client,
        fixture.id,
        fixture.kickoff_at,
        new Date(now)
      );

      if (!needsSync) {
        skippedComplete += 1;
        continue;
      }

      const result = await ingestLineupsFromProvider(fixture.provider_id);
      apiRequests += result.stats.apiRequests;

      if (result.ok) {
        synced += 1;
      } else {
        errors += 1;
        console.warn(
          `[sync-lineups] fixture ${fixture.provider_id}: ${result.reason ?? "unknown"}`
        );
      }
    } catch (error) {
      errors += 1;
      console.error(`[sync-lineups] fixture ${fixture.provider_id}`, error);
    }
  }

  const outcome = resolveCronOutcome({
    failedCount: errors,
    partialForTimeBudget: stoppedForTimeBudget && errors === 0 && synced > 0,
  });

  return {
    ok: outcome.ok,
    degraded: outcome.degraded,
    job: "sync-lineups",
    stats: {
      candidates: candidates.length,
      synced,
      skippedComplete,
      errors,
      apiRequests,
      leaguesRequested: config.leagueProviderIds.length,
      leaguesWithLineups: lineupLeagueProviderIds.length,
      leaguesSkippedNoLineups,
      ...(stoppedForTimeBudget
        ? {
            stoppedForTimeBudget: true,
            candidatesRemaining: candidates.length - processed,
          }
        : {}),
    },
  };
}
