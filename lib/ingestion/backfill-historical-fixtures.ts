import pRetry from "p-retry";

import { apiFootballFetchAllPagesResponse } from "@/lib/api-football/client";
import { listSeasonsByLeague } from "@/lib/api-football/endpoints/leagues";
import { listFixturesByTeamSeasonRaw } from "@/lib/api-football/endpoints/fixtures";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import {
  BACKFILL_MAX_SEASONS_PER_LEAGUE,
  BACKFILL_TARGET_FINISHED_PER_TEAM,
  resolveBackfillLeagueProviderIds,
  TIER1_GAP_FILL_TEAM_PROVIDER_IDS,
} from "@/lib/ingestion/backfill-tiers";
import {
  finishIngestionSyncRun,
  getLeagueSeasonSyncState,
  startIngestionSyncRun,
  upsertLeagueSeasonSyncState,
} from "@/lib/ingestion/ingestion-sync-state";
import { runTeamHistoryRepairBatch } from "@/lib/ingestion/repair-team-history";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

const FINISHED_STATUSES = ["FT", "AET", "PEN"] as const;

export type BackfillHistoricalOptions = {
  tier: 1 | 2;
  resume?: boolean;
  dryRun?: boolean;
  gapFillTeams?: boolean;
};

export type BackfillHistoricalResult = {
  leaguesProcessed: number;
  seasonsProcessed: number;
  seasonsSkipped: number;
  apiRequests: number;
  fixturesUpserted: number;
  ingestErrors: number;
  teamGapFillRequests: number;
  runId: string | null;
};

function isTransientIngestError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("503") ||
    message.includes("502")
  );
}

async function ingestFixtureWithRetry(
  client: ReturnType<typeof createAdminClient>,
  raw: RawApiFootballFixture
): Promise<void> {
  await pRetry(() => ingestFixtureFromRaw(client, raw), {
    retries: 3,
    minTimeout: 2_000,
    maxTimeout: 10_000,
    shouldRetry: ({ error }) => isTransientIngestError(error),
  });
}

async function fetchRawFixturesByLeagueSeason(
  leagueId: number,
  season: number
): Promise<{ fixtures: RawApiFootballFixture[]; apiRequests: number }> {
  let apiRequests = 0;
  const fixtures =
    await apiFootballFetchAllPagesResponse<RawApiFootballFixture>(
      "/fixtures",
      { league: leagueId, season },
      {
        onAfterPage: async () => {
          apiRequests += 1;
          await throttleProviderRequest();
        },
      }
    );
  if (apiRequests === 0) {
    apiRequests = 1;
  }
  return { fixtures, apiRequests };
}

async function countFinishedFixturesForTeam(
  teamProviderId: number
): Promise<number> {
  const client = createAdminClient();
  const { data: team } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  if (!team) {
    return 0;
  }

  const { count, error } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .in("status", [...FINISHED_STATUSES]);

  if (error) {
    throw new Error(
      `Failed to count finished fixtures for team ${teamProviderId}: ${error.message}`
    );
  }

  return count ?? 0;
}

async function syncLeagueSeason(
  client: ReturnType<typeof createAdminClient>,
  leagueProviderId: number,
  seasonYear: number,
  dryRun: boolean
): Promise<{
  fixturesUpserted: number;
  apiRequests: number;
  ingestErrors: number;
}> {
  let fixturesUpserted = 0;
  let ingestErrors = 0;

  await throttleProviderRequest();
  const { fixtures, apiRequests } = await fetchRawFixturesByLeagueSeason(
    leagueProviderId,
    seasonYear
  );

  if (dryRun) {
    return { fixturesUpserted: fixtures.length, apiRequests, ingestErrors: 0 };
  }

  for (const raw of fixtures) {
    try {
      await ingestFixtureWithRetry(client, raw);
      fixturesUpserted += 1;
    } catch (error) {
      ingestErrors += 1;
      console.error(
        `[backfill] fixture ${raw.fixture.id} (${leagueProviderId}/${seasonYear}):`,
        error
      );
    }
  }

  await upsertLeagueSeasonSyncState(client, {
    leagueProviderId,
    seasonYear,
    fixturesUpserted,
    apiRequests,
    status: ingestErrors > 0 ? "failed" : "complete",
    errorMessage:
      ingestErrors > 0 ? `${ingestErrors} fixture ingest error(s)` : null,
  });

  return { fixturesUpserted, apiRequests, ingestErrors };
}

async function gapFillTeamSeasons(
  client: ReturnType<typeof createAdminClient>,
  teamProviderId: number,
  seasonYears: number[],
  dryRun: boolean
): Promise<{
  apiRequests: number;
  fixturesUpserted: number;
  ingestErrors: number;
}> {
  let apiRequests = 0;
  let fixturesUpserted = 0;
  let ingestErrors = 0;

  for (const seasonYear of seasonYears) {
    await throttleProviderRequest();
    const rawFixtures = await listFixturesByTeamSeasonRaw(
      teamProviderId,
      seasonYear
    );
    apiRequests += 1;

    if (dryRun) {
      fixturesUpserted += rawFixtures.length;
      continue;
    }

    for (const raw of rawFixtures) {
      try {
        await ingestFixtureWithRetry(client, raw);
        fixturesUpserted += 1;
      } catch (error) {
        ingestErrors += 1;
        console.error(
          `[backfill] team gap ${teamProviderId}/${seasonYear} fixture ${raw.fixture.id}:`,
          error
        );
      }
    }
  }

  return { apiRequests, fixturesUpserted, ingestErrors };
}

function resolveSeasonYearsForLeague(
  seasons: Awaited<ReturnType<typeof listSeasonsByLeague>>
): number[] {
  return seasons
    .map((season) => season.year)
    .sort((left, right) => right - left)
    .slice(0, BACKFILL_MAX_SEASONS_PER_LEAGUE);
}

export async function backfillHistoricalFixtures(
  options: BackfillHistoricalOptions
): Promise<BackfillHistoricalResult> {
  const {
    tier,
    resume = false,
    dryRun = false,
    gapFillTeams = tier === 1,
  } = options;

  const leagueProviderIds = resolveBackfillLeagueProviderIds(tier);
  const client = createAdminClient();

  const runId = dryRun
    ? null
    : await startIngestionSyncRun("backfill-historical-fixtures", tier);

  let apiRequests = 0;
  let fixturesUpserted = 0;
  let ingestErrors = 0;
  let seasonsProcessed = 0;
  let seasonsSkipped = 0;
  let teamGapFillRequests = 0;
  let stoppedForTimeBudget = false;

  const backfillBudgetRaw = process.env.BACKFILL_WALL_CLOCK_BUDGET_MS;
  const backfillBudgetMs = backfillBudgetRaw
    ? Number.parseInt(backfillBudgetRaw, 10)
    : null;
  const backfillStartedAtMs = Date.now();
  const backfillBudgetExceeded = () =>
    backfillBudgetMs != null &&
    Number.isFinite(backfillBudgetMs) &&
    backfillBudgetMs > 0 &&
    Date.now() - backfillStartedAtMs >= backfillBudgetMs;

  try {
    for (const leagueProviderId of leagueProviderIds) {
      if (backfillBudgetExceeded()) {
        stoppedForTimeBudget = true;
        break;
      }

      await throttleProviderRequest();
      const seasons = await listSeasonsByLeague(leagueProviderId);
      apiRequests += 1;

      const seasonYears = resolveSeasonYearsForLeague(seasons);

      for (const seasonYear of seasonYears) {
        if (backfillBudgetExceeded()) {
          stoppedForTimeBudget = true;
          break;
        }

        if (resume && !dryRun) {
          const existing = await getLeagueSeasonSyncState(
            leagueProviderId,
            seasonYear
          );
          if (existing?.status === "complete") {
            seasonsSkipped += 1;
            continue;
          }
        }

        seasonsProcessed += 1;
        const result = await syncLeagueSeason(
          client,
          leagueProviderId,
          seasonYear,
          dryRun
        );
        apiRequests += result.apiRequests;
        fixturesUpserted += result.fixturesUpserted;
        ingestErrors += result.ingestErrors;
      }

      if (stoppedForTimeBudget) {
        break;
      }
    }

    if (!stoppedForTimeBudget && !dryRun) {
      const repairBatch = await runTeamHistoryRepairBatch({
        maxTeams: 8,
        budgetMs: backfillBudgetMs ?? 120_000,
      });
      apiRequests += repairBatch.apiRequests;
      fixturesUpserted += repairBatch.fixturesUpserted;
      if (backfillBudgetExceeded()) {
        stoppedForTimeBudget = true;
      }
    }

    if (gapFillTeams && !stoppedForTimeBudget) {
      const seasonCandidates = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

      for (const teamProviderId of TIER1_GAP_FILL_TEAM_PROVIDER_IDS) {
        if (backfillBudgetExceeded()) {
          stoppedForTimeBudget = true;
          break;
        }

        const finished = await countFinishedFixturesForTeam(teamProviderId);
        if (finished >= BACKFILL_TARGET_FINISHED_PER_TEAM) {
          continue;
        }

        const gapResult = await gapFillTeamSeasons(
          client,
          teamProviderId,
          seasonCandidates,
          dryRun
        );
        teamGapFillRequests += gapResult.apiRequests;
        apiRequests += gapResult.apiRequests;
        fixturesUpserted += gapResult.fixturesUpserted;
        ingestErrors += gapResult.ingestErrors;
      }
    }

    if (runId) {
      await finishIngestionSyncRun(runId, {
        status:
          ingestErrors > 0 && !stoppedForTimeBudget ? "failed" : "complete",
        stats: {
          tier,
          leaguesProcessed: leagueProviderIds.length,
          seasonsProcessed,
          seasonsSkipped,
          apiRequests,
          fixturesUpserted,
          ingestErrors,
          teamGapFillRequests,
          ...(stoppedForTimeBudget ? { stoppedForTimeBudget: true } : {}),
        },
        errorMessage:
          ingestErrors > 0
            ? `${ingestErrors} ingest error(s)`
            : stoppedForTimeBudget
              ? "Stopped for wall-clock budget; re-run with --resume"
              : undefined,
      });
    }
  } catch (error) {
    if (runId) {
      await finishIngestionSyncRun(runId, {
        status: "failed",
        stats: { tier, apiRequests, fixturesUpserted },
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }

  return {
    leaguesProcessed: leagueProviderIds.length,
    seasonsProcessed,
    seasonsSkipped,
    apiRequests,
    fixturesUpserted,
    ingestErrors,
    teamGapFillRequests,
    runId,
  };
}
