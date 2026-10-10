import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import { addUtcDays, utcDateString } from "@/lib/fixtures/window";
import { resolveBackfillLeagueProviderIds } from "@/lib/ingestion/backfill-tiers";
import { createCronIngestBudget } from "@/lib/ingestion/cron-budget";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import {
  getIngestionConfig,
  isLeagueInAllowlist,
} from "@/lib/ingestion/config";
import {
  clearJobCheckpoint,
  getJobCheckpoint,
  SYNC_FIXTURES_FUTURE_JOB,
  upsertJobCheckpoint,
} from "@/lib/ingestion/ingestion-job-checkpoint";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import {
  finishIngestionSyncRun,
  startIngestionSyncRun,
} from "@/lib/ingestion/ingestion-sync-state";
import {
  dateScanEndExclusive,
  isUtcDateBeforeEnd,
  leagueSeasonCursor,
  parseSyncFixturesFutureCheckpoint,
  resolveDateScanStart,
  type SyncFixturesFutureCheckpoint,
} from "@/lib/ingestion/sync-fixtures-future-cursor";
import { syncLeagueSeasonFixturesBounded } from "@/lib/ingestion/sync-league-season-fixtures";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncFixturesFutureResult = {
  ok: boolean;
  job: string;
  degraded?: boolean;
  stats: {
    futureDaysScanned: number;
    dateApiRequests: number;
    leagueSeasonSyncs: number;
    fixturesUpserted: number;
    fixturesFilteredOut: number;
    fixtureErrors: number;
    syncRunId?: string;
    stoppedForTimeBudget?: boolean;
    checkpoint?: SyncFixturesFutureCheckpoint;
  };
};

export function resolveFutureHorizonDays(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = source.FIXTURES_FUTURE_INGEST_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : 21;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21;
}

function resolveFutureLeagueSeasonBatch(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = source.FUTURE_LEAGUE_SEASON_BATCH;
  const parsed = raw ? Number.parseInt(raw, 10) : 2;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

export async function syncFixturesFuture(
  anchor = new Date()
): Promise<SyncFixturesFutureResult> {
  const syncRunId = await startIngestionSyncRun("sync-fixtures-future");
  const config = getIngestionConfig();
  const client = createAdminClient();
  const syncedAt = anchor.toISOString();
  const today = utcDateString(anchor);
  const horizonDays = resolveFutureHorizonDays();
  const endExclusive = dateScanEndExclusive(today, horizonDays);
  const tierOneLeagueIds = resolveBackfillLeagueProviderIds(1);
  const leagueSeasonBatch = resolveFutureLeagueSeasonBatch();

  const budget = createCronIngestBudget(Date.now());
  const rawCheckpoint = await getJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB);
  let checkpoint = parseSyncFixturesFutureCheckpoint(
    rawCheckpoint,
    today,
    horizonDays
  );

  let dateApiRequests = 0;
  let fixturesUpserted = 0;
  let fixturesFilteredOut = 0;
  let fixtureErrors = 0;
  let futureDaysScanned = 0;
  let leagueSeasonSyncs = 0;
  let stoppedForTimeBudget = false;

  const logBudgetStop = (
    phase: string,
    activeCheckpoint: SyncFixturesFutureCheckpoint
  ) => {
    logIngestionEvent({
      job_name: SYNC_FIXTURES_FUTURE_JOB,
      stage: "budget_stop",
      error_type: "budget_exceeded",
      ok: true,
      degraded: true,
      reason: `Stopped during ${phase} for wall-clock budget`,
      detail: { checkpoint: activeCheckpoint },
    });
  };

  try {
    const resolved = resolveDateScanStart(checkpoint, today, horizonDays);

    if (resolved.phase === "date_scan" && resolved.startUtcDate) {
      for (
        let cursor = resolved.startUtcDate;
        isUtcDateBeforeEnd(cursor, endExclusive);
        cursor = addUtcDays(cursor, 1)
      ) {
        if (budget.exceeded()) {
          stoppedForTimeBudget = true;
          checkpoint = {
            phase: "date_scan",
            nextUtcDate: cursor,
            anchorUtcDate: today,
            horizonDays,
          };
          await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
          logBudgetStop("date_scan", checkpoint);
          break;
        }

        futureDaysScanned += 1;
        await throttleProviderRequest();

        const rawFixtures =
          await apiFootballFetchResponse<RawApiFootballFixture>("/fixtures", {
            date: cursor,
          });
        dateApiRequests += 1;

        const allowlisted = rawFixtures.filter((raw) =>
          isLeagueInAllowlist(raw.league.id, config)
        );
        fixturesFilteredOut += rawFixtures.length - allowlisted.length;

        for (const raw of allowlisted) {
          if (budget.exceeded()) {
            stoppedForTimeBudget = true;
            checkpoint = {
              phase: "date_scan",
              nextUtcDate: cursor,
              anchorUtcDate: today,
              horizonDays,
            };
            await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
            logBudgetStop("date_scan_fixture_upsert", checkpoint);
            break;
          }

          try {
            await ingestFixtureFromRaw(client, raw, syncedAt);
            fixturesUpserted += 1;
          } catch (error) {
            fixtureErrors += 1;
            console.error(
              `[sync-fixtures-future] fixture ${raw.fixture.id}`,
              error
            );
          }
        }

        if (stoppedForTimeBudget) {
          break;
        }
      }

      if (!stoppedForTimeBudget) {
        checkpoint = leagueSeasonCursor(today, horizonDays, tierOneLeagueIds);
        await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
      }
    }

    if (!stoppedForTimeBudget) {
      const leagueStartIndex =
        checkpoint?.phase === "league_season"
          ? checkpoint.nextIndex
          : resolved.phase === "league_season"
            ? resolved.leagueSeasonIndex
            : 0;

      const leagueIds =
        checkpoint?.phase === "league_season"
          ? checkpoint.leagueProviderIds
          : tierOneLeagueIds;

      if (budget.exceeded()) {
        stoppedForTimeBudget = true;
        checkpoint = leagueSeasonCursor(today, horizonDays, leagueIds);
        checkpoint.nextIndex = leagueStartIndex;
        await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
        logBudgetStop("league_season_preflight", checkpoint);
      } else {
        const leagueResult = await syncLeagueSeasonFixturesBounded({
          mode: "current_and_next",
          anchor,
          leagueProviderIds: leagueIds,
          startLeagueIndex: leagueStartIndex,
          maxLeagues: leagueSeasonBatch,
          budgetExceeded: () => budget.exceeded(),
        });

        fixturesUpserted += leagueResult.fixturesUpserted;
        leagueSeasonSyncs += leagueResult.leaguesSynced;
        dateApiRequests += leagueResult.apiRequests;

        if (leagueResult.stoppedForTimeBudget) {
          stoppedForTimeBudget = true;
          checkpoint = {
            phase: "league_season",
            leagueProviderIds: [...leagueIds],
            nextIndex: leagueResult.nextLeagueIndex,
            anchorUtcDate: today,
            horizonDays,
          };
          await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
          logBudgetStop("league_season", checkpoint);
        } else if (leagueResult.nextLeagueIndex >= leagueIds.length) {
          await clearJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB);
          checkpoint = null;
        } else {
          checkpoint = {
            phase: "league_season",
            leagueProviderIds: [...leagueIds],
            nextIndex: leagueResult.nextLeagueIndex,
            anchorUtcDate: today,
            horizonDays,
          };
          await upsertJobCheckpoint(SYNC_FIXTURES_FUTURE_JOB, checkpoint);
        }
      }
    }

    const stats = {
      futureDaysScanned,
      dateApiRequests,
      leagueSeasonSyncs,
      fixturesUpserted,
      fixturesFilteredOut,
      fixtureErrors,
      syncRunId,
      ...(stoppedForTimeBudget && checkpoint
        ? { stoppedForTimeBudget: true, checkpoint }
        : {}),
    };

    const outcome = resolveCronOutcome({
      failedCount: fixtureErrors,
      partialForTimeBudget:
        stoppedForTimeBudget && fixtureErrors === 0 && fixturesUpserted > 0,
    });

    await finishIngestionSyncRun(syncRunId, {
      status: outcome.ok || stoppedForTimeBudget ? "complete" : "failed",
      stats,
      errorMessage:
        fixtureErrors > 0
          ? `${fixtureErrors} fixture upsert error(s)`
          : stoppedForTimeBudget
            ? "Stopped for wall-clock budget; checkpoint persisted"
            : undefined,
    });

    return {
      ok: outcome.ok,
      degraded: outcome.degraded,
      job: SYNC_FIXTURES_FUTURE_JOB,
      stats,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await finishIngestionSyncRun(syncRunId, {
      status: "failed",
      stats: {
        futureDaysScanned,
        dateApiRequests,
        fixturesUpserted,
        fixturesFilteredOut,
        fixtureErrors,
        syncRunId,
      },
      errorMessage: message,
    });

    throw error;
  }
}
