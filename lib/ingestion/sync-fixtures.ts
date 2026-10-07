import { apiFootballFetchAllPagesResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  competitionSupportsFixtureEvents,
  competitionSupportsFixtureStatistics,
  competitionSupportsLineups,
  competitionSupportsPlayerPerformances,
} from "@/lib/competitions/capabilities";
import { findCompetition } from "@/lib/competitions/index";
import {
  buildFixtureDateWindow,
  getIngestionConfig,
  isLeagueInAllowlist,
  isTodayOrTomorrowUtc,
} from "@/lib/ingestion/config";
import { createCronIngestBudget } from "@/lib/ingestion/cron-budget";
import { resolveCronOutcome } from "@/lib/ingestion/cron-outcome";
import { logIngestionEvent } from "@/lib/ingestion/ingestion-observability";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  countAllowlistFixturesForUtcDate,
  ingestFixtureFromRaw,
} from "@/lib/ingestion/upsert";
import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import { fixtureNeedsMatchDetailSync } from "@/lib/ingestion/ingestion-result";
import type { FixtureStatus } from "@/types/domain";
import { getRedis } from "@/lib/redis/client";
import { providerFixturesDateKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

function competitionSupportsAnyMatchDetails(providerId: number): boolean {
  const competition = findCompetition(providerId);
  return (
    competitionSupportsFixtureEvents(competition) ||
    competitionSupportsFixtureStatistics(competition) ||
    competitionSupportsPlayerPerformances(competition) ||
    competitionSupportsLineups(competition)
  );
}

export type SyncFixturesResult = {
  ok: boolean;
  job: string;
  skipped?: boolean;
  degraded?: boolean;
  reason?: string;
  stats: {
    datesRequested: number;
    datesSkipped: number;
    datesPartiallyProcessed?: number;
    apiRequests: number;
    fixturesUpserted: number;
    fixturesFilteredOut: number;
    matchDetailsIngested: number;
    stoppedForTimeBudget?: boolean;
  };
};

async function shouldSkipDateSync(
  date: string,
  leagueProviderIds: readonly number[]
): Promise<boolean> {
  if (isTodayOrTomorrowUtc(date)) {
    return false;
  }

  const client = createAdminClient();
  const counts = await countAllowlistFixturesForUtcDate(
    client,
    date,
    leagueProviderIds
  );

  if (counts.total === 0) {
    return false;
  }

  return (
    counts.total === counts.terminal && counts.syncedToday === counts.total
  );
}

export async function syncFixtures(
  anchor = new Date()
): Promise<SyncFixturesResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const dates = buildFixtureDateWindow(anchor, config.fixtureWindowDays);
  const syncedAt = anchor.toISOString();

  let datesSkipped = 0;
  let apiRequests = 0;
  let fixturesUpserted = 0;
  let fixturesFilteredOut = 0;
  let matchDetailsIngested = 0;
  let stoppedForTimeBudget = false;
  let datesPartiallyProcessed = 0;
  const budget = createCronIngestBudget(Date.now());

  for (const date of dates) {
    if (budget.exceeded()) {
      stoppedForTimeBudget = true;
      logIngestionEvent({
        job_name: "sync-fixtures",
        stage: "budget_stop",
        error_type: "budget_exceeded",
        ok: true,
        degraded: true,
        reason: "Stopped before next date fetch for wall-clock budget",
      });
      break;
    }

    if (await shouldSkipDateSync(date, config.leagueProviderIds)) {
      datesSkipped += 1;
      continue;
    }

    if (apiRequests > 0) {
      await throttleProviderRequest();
    }

    const rawFixtures =
      await apiFootballFetchAllPagesResponse<RawApiFootballFixture>(
        "/fixtures",
        { date }
      );
    apiRequests += 1;

    const allowlisted = rawFixtures.filter((raw) =>
      isLeagueInAllowlist(raw.league.id, config)
    );
    fixturesFilteredOut += rawFixtures.length - allowlisted.length;

    const domainFixtures: Fixture[] = [];
    let datePartial = false;

    for (const raw of allowlisted) {
      if (budget.exceeded()) {
        stoppedForTimeBudget = true;
        datePartial = true;
        logIngestionEvent({
          job_name: "sync-fixtures",
          stage: "budget_stop",
          error_type: "budget_exceeded",
          ok: true,
          degraded: true,
          reason: "Stopped mid-date fixture upserts for wall-clock budget",
          detail: { date },
        });
        break;
      }

      const { fixtureId, domain } = await ingestFixtureFromRaw(
        client,
        raw,
        syncedAt
      );
      domainFixtures.push(domain);
      fixturesUpserted += 1;

      const isTerminal = ["FT", "AET", "PEN"].includes(domain.status);
      if (
        isTerminal &&
        matchDetailsIngested === 0 &&
        competitionSupportsAnyMatchDetails(domain.league.externalId)
      ) {
        const needsDetails = await fixtureNeedsMatchDetailSync(
          client,
          fixtureId,
          {
            fixtureStatus: domain.status as FixtureStatus,
            kickoffAt: domain.kickoffAt,
            competition: findCompetition(domain.league.externalId),
          }
        );
        if (needsDetails) {
          await ingestMatchDetailsFromProvider(domain.externalId);
          matchDetailsIngested += 1;
        }
      }
    }

    if (datePartial) {
      datesPartiallyProcessed += 1;
      break;
    }

    const redis = getRedis();
    if (redis && domainFixtures.length > 0) {
      await redis.set(
        providerFixturesDateKey(date),
        {
          value: domainFixtures,
          cachedAt: syncedAt,
        },
        { ex: 86_400 }
      );
    }
  }

  const outcome = resolveCronOutcome({
    failedCount: 0,
    partialForTimeBudget: stoppedForTimeBudget && fixturesUpserted > 0,
  });

  return {
    ok: outcome.ok,
    degraded: outcome.degraded,
    job: "sync-fixtures",
    stats: {
      datesRequested: dates.length,
      datesSkipped,
      ...(datesPartiallyProcessed > 0 ? { datesPartiallyProcessed } : {}),
      apiRequests,
      fixturesUpserted,
      fixturesFilteredOut,
      matchDetailsIngested,
      ...(stoppedForTimeBudget ? { stoppedForTimeBudget: true } : {}),
    },
  };
}
