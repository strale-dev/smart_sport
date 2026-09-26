import { apiFootballFetchResponse } from "@/lib/api-football/client";

import type { RawApiFootballFixture } from "@/lib/api-football/types";

import { resolveBackfillLeagueProviderIds } from "@/lib/ingestion/backfill-tiers";

import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";

import {
  getIngestionConfig,
  isLeagueInAllowlist,
} from "@/lib/ingestion/config";

import {
  finishIngestionSyncRun,
  startIngestionSyncRun,
} from "@/lib/ingestion/ingestion-sync-state";

import { syncLeagueSeasonFixtures } from "@/lib/ingestion/sync-league-season-fixtures";

import { throttleProviderRequest } from "@/lib/ingestion/throttle";

import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";

import { addUtcDays, utcDateString } from "@/lib/fixtures/window";

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
  };
};

function resolveFutureHorizonDays(
  source: Record<string, string | undefined> = process.env
): number {
  const raw = source.FIXTURES_FUTURE_INGEST_DAYS;

  const parsed = raw ? Number.parseInt(raw, 10) : 21;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 21;
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

  const endExclusive = addUtcDays(today, horizonDays + 1);

  let dateApiRequests = 0;

  let fixturesUpserted = 0;

  let fixturesFilteredOut = 0;

  let fixtureErrors = 0;

  let futureDaysScanned = 0;

  try {
    for (
      let cursor = today;
      cursor < endExclusive;
      cursor = addUtcDays(cursor, 1)
    ) {
      futureDaysScanned += 1;

      await throttleProviderRequest();

      const rawFixtures = await apiFootballFetchResponse<RawApiFootballFixture>(
        "/fixtures",

        { date: cursor }
      );

      dateApiRequests += 1;

      const allowlisted = rawFixtures.filter((raw) =>
        isLeagueInAllowlist(raw.league.id, config)
      );

      fixturesFilteredOut += rawFixtures.length - allowlisted.length;

      for (const raw of allowlisted) {
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
    }

    const leagueSeasonSyncs = await syncLeagueSeasonFixtures({
      mode: "current_and_next",

      anchor,

      leagueProviderIds: resolveBackfillLeagueProviderIds(1),
    });

    fixturesUpserted += leagueSeasonSyncs.fixturesUpserted;

    const stats = {
      futureDaysScanned,

      dateApiRequests,

      leagueSeasonSyncs: leagueSeasonSyncs.leaguesSynced,

      fixturesUpserted,

      fixturesFilteredOut,

      fixtureErrors,

      syncRunId,
    };

    const outcome = resolveCronOutcome({ failedCount: fixtureErrors });

    await finishIngestionSyncRun(syncRunId, {
      status: outcome.ok ? "complete" : "failed",

      stats,

      errorMessage:
        fixtureErrors > 0
          ? `${fixtureErrors} fixture upsert error(s)`
          : undefined,
    });

    return {
      ok: outcome.ok,

      degraded: outcome.degraded,

      job: "sync-fixtures-future",

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
