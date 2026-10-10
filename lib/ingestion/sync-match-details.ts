import {
  competitionSupportsFixtureEvents,
  competitionSupportsFixtureStatistics,
  competitionSupportsLineups,
  competitionSupportsPlayerPerformances,
} from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import { createCronIngestBudget } from "@/lib/ingestion/cron-budget";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import { fixtureNeedsMatchDetailSync } from "@/lib/ingestion/ingestion-result";
import {
  fixtureHasLineups,
  fixtureNeedsLineupSync,
} from "@/lib/ingestion/match-details-upsert";
import type { FixtureStatus } from "@/types/domain";
import { createAdminClient } from "@/lib/supabase/admin";

const TERMINAL_STATUSES = ["FT", "AET", "PEN"] as const;

function competitionNeedsMatchDetailSync(providerId: number): boolean {
  const competition = findCompetition(providerId);
  return (
    competitionSupportsFixtureEvents(competition) ||
    competitionSupportsFixtureStatistics(competition) ||
    competitionSupportsPlayerPerformances(competition) ||
    competitionSupportsLineups(competition)
  );
}

function getMatchDetailsSyncBatch(): number {
  const raw = process.env.MATCH_DETAILS_SYNC_BATCH;
  const parsed = raw ? Number.parseInt(raw, 10) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export type SyncMatchDetailsResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  degraded?: boolean;
  reason?: string;
  stats: {
    candidates: number;
    ingested: number;
    failed: number;
    apiRequests: number;
    stoppedForTimeBudget?: boolean;
    candidatesRemaining?: number;
  };
};

export async function syncMatchDetails(): Promise<SyncMatchDetailsResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const batchSize = getMatchDetailsSyncBatch();
  const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString();

  const detailLeagueProviderIds = config.leagueProviderIds.filter((id) =>
    competitionNeedsMatchDetailSync(id)
  );

  const { data: leagues, error: leaguesError } = await client
    .from("leagues")
    .select("id, provider_id")
    .in("provider_id", [...detailLeagueProviderIds]);

  if (leaguesError) {
    throw new Error(`Failed to load leagues: ${leaguesError.message}`);
  }

  if (!leagues?.length) {
    return {
      ok: true,
      job: "sync-match-details",
      skipped: true,
      reason: "No allowlist leagues in database.",
      stats: { candidates: 0, ingested: 0, failed: 0, apiRequests: 0 },
    };
  }

  const leagueIds = leagues.map((league) => league.id);
  const leagueProviderByUuid = new Map(
    leagues.map((league) => [league.id, league.provider_id])
  );

  const { data: fixtures, error: fixturesError } = await client
    .from("fixtures")
    .select("id, provider_id, status, kickoff_at, league_id")
    .in("league_id", leagueIds)
    .in("status", [...TERMINAL_STATUSES])
    .gte("kickoff_at", cutoff)
    .order("kickoff_at", { ascending: false })
    .limit(batchSize * 3);

  if (fixturesError) {
    throw new Error(`Failed to load fixtures: ${fixturesError.message}`);
  }

  type Candidate = {
    provider_id: number;
    needs: "details" | "lineups";
  };

  const candidates: Candidate[] = [];

  for (const fixture of fixtures ?? []) {
    if (candidates.length >= batchSize) {
      break;
    }

    const leagueProviderId = leagueProviderByUuid.get(fixture.league_id);
    if (
      leagueProviderId != null &&
      !competitionNeedsMatchDetailSync(leagueProviderId)
    ) {
      continue;
    }

    const competition = findCompetition(leagueProviderId ?? -1);
    const needsDetails = await fixtureNeedsMatchDetailSync(client, fixture.id, {
      fixtureStatus: fixture.status as FixtureStatus,
      kickoffAt: fixture.kickoff_at,
      competition,
    });
    if (needsDetails) {
      candidates.push({ provider_id: fixture.provider_id, needs: "details" });
      continue;
    }

    const hasLineups = await fixtureHasLineups(client, fixture.id);
    const needsLineups =
      !hasLineups &&
      competitionSupportsLineups(competition) &&
      (await fixtureNeedsLineupSync(client, fixture.id, fixture.kickoff_at));
    if (needsLineups) {
      candidates.push({ provider_id: fixture.provider_id, needs: "lineups" });
    }
  }

  let ingested = 0;
  let failed = 0;
  let apiRequests = 0;
  let stoppedForTimeBudget = false;
  let processed = 0;
  const budget = createCronIngestBudget(Date.now());

  for (const fixture of candidates) {
    if (budget.exceeded()) {
      stoppedForTimeBudget = true;
      logIngestionEvent({
        job_name: "sync-match-details",
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

    if (fixture.needs === "lineups") {
      const result = await ingestLineupsFromProvider(fixture.provider_id);
      apiRequests += result.stats.apiRequests;
      if (
        result.outcome === "SUCCESS" ||
        result.outcome === "SKIPPED" ||
        result.outcome === "PARTIAL"
      ) {
        ingested += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    const result = await ingestMatchDetailsFromProvider(fixture.provider_id);
    apiRequests += result.stats.apiRequests;

    if (
      result.outcome === "SUCCESS" ||
      result.outcome === "SKIPPED" ||
      result.outcome === "PARTIAL"
    ) {
      ingested += 1;
    } else {
      failed += 1;
    }
  }

  const cronOutcome = resolveCronOutcome({
    failedCount: failed,
    partialForTimeBudget: stoppedForTimeBudget && failed === 0 && ingested > 0,
  });

  return {
    ok: cronOutcome.ok,
    degraded: cronOutcome.degraded,
    job: "sync-match-details",
    stats: {
      candidates: candidates.length,
      ingested,
      failed,
      apiRequests,
      ...(stoppedForTimeBudget
        ? {
            stoppedForTimeBudget: true,
            candidatesRemaining: candidates.length - processed,
          }
        : {}),
    },
  };
}
