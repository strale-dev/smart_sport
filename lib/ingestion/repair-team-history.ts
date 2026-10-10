import pRetry from "p-retry";

import { listFixturesByTeamSeasonRaw } from "@/lib/api-football/endpoints/fixtures";
import {
  countCompletedTeamFixturesByProviderId,
  getTeamUuidByProviderId,
  TEAM_HISTORY_MIN_MATCHES,
  TEAM_HISTORY_TARGET_MATCHES,
  TERMINAL_FIXTURE_STATUSES,
} from "@/lib/analytics/team-history-query";
import { createCronIngestBudget } from "@/lib/ingestion/cron-budget";
import { getIngestionConfig } from "@/lib/ingestion/config";
import {
  clearJobCheckpoint,
  getJobCheckpoint,
  upsertJobCheckpoint,
} from "@/lib/ingestion/ingestion-job-checkpoint";
import {
  refreshTeamSyncStateFromDb,
  upsertTeamSyncState,
} from "@/lib/ingestion/ingestion-team-sync-state";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

export const REPAIR_TEAM_HISTORY_JOB = "repair-team-history";

const FINISHED_STATUSES = [...TERMINAL_FIXTURE_STATUSES];

export type RepairTeamHistoryOptions = {
  force?: boolean;
  dryRun?: boolean;
  targetCount?: number;
  minCount?: number;
};

export type RepairTeamHistoryResult = {
  teamProviderId: number;
  skipped: boolean;
  apiRequests: number;
  fixturesUpserted: number;
  finishedCountAfter: number;
  seasonsFetched: number;
  lastRepairSeasonYear: number | null;
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

async function ingestRawWithRetry(
  raw: Awaited<ReturnType<typeof listFixturesByTeamSeasonRaw>>[number]
): Promise<void> {
  const client = createAdminClient();
  await pRetry(() => ingestFixtureFromRaw(client, raw), {
    retries: 2,
    minTimeout: 1_000,
    maxTimeout: 5_000,
    shouldRetry: ({ error }) => isTransientIngestError(error),
  });
}

async function listSeasonYearsForTeam(
  teamProviderId: number
): Promise<number[]> {
  const client = createAdminClient();
  const teamUuid = await getTeamUuidByProviderId(teamProviderId);
  if (!teamUuid) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select("season:seasons (year)")
    .or(`home_team_id.eq.${teamUuid},away_team_id.eq.${teamUuid}`)
    .limit(2000);

  if (error) {
    throw new Error(
      `Failed to list seasons for team ${teamProviderId}: ${error.message}`
    );
  }

  const years = new Set<number>();
  for (const row of data ?? []) {
    const season = Array.isArray(row.season) ? row.season[0] : row.season;
    if (season?.year != null) {
      years.add(season.year);
    }
  }

  const currentYear = new Date().getUTCFullYear();
  for (let year = currentYear; year >= currentYear - 8; year -= 1) {
    years.add(year);
  }

  return [...years].sort((a, b) => b - a);
}

export async function repairTeamHistory(
  teamProviderId: number,
  options: RepairTeamHistoryOptions = {}
): Promise<RepairTeamHistoryResult> {
  const beforeAt = new Date().toISOString();
  const minCount = options.minCount ?? TEAM_HISTORY_MIN_MATCHES;
  const targetCount = options.targetCount ?? TEAM_HISTORY_TARGET_MATCHES;

  const existing = await countCompletedTeamFixturesByProviderId({
    teamProviderId,
    beforeAt,
  });

  if (!options.force && existing >= minCount) {
    const teamUuid = await getTeamUuidByProviderId(teamProviderId);
    if (teamUuid) {
      await refreshTeamSyncStateFromDb({ teamProviderId, teamUuid, beforeAt });
    }

    return {
      teamProviderId,
      skipped: true,
      apiRequests: 0,
      fixturesUpserted: 0,
      finishedCountAfter: existing,
      seasonsFetched: 0,
      lastRepairSeasonYear: null,
    };
  }

  if (options.dryRun) {
    return {
      teamProviderId,
      skipped: false,
      apiRequests: 0,
      fixturesUpserted: 0,
      finishedCountAfter: existing,
      seasonsFetched: 0,
      lastRepairSeasonYear: null,
    };
  }

  let apiRequests = 0;
  let fixturesUpserted = 0;
  let seasonsFetched = 0;
  let lastRepairSeasonYear: number | null = null;
  let finishedCount = existing;

  const seasonYears = await listSeasonYearsForTeam(teamProviderId);

  for (const seasonYear of seasonYears) {
    if (finishedCount >= targetCount) {
      break;
    }

    await throttleProviderRequest();
    const rawFixtures = await listFixturesByTeamSeasonRaw(
      teamProviderId,
      seasonYear
    );
    apiRequests += 1;
    seasonsFetched += 1;
    lastRepairSeasonYear = seasonYear;

    for (const raw of rawFixtures) {
      const status = raw.fixture.status.short;
      if (
        !FINISHED_STATUSES.includes(
          status as (typeof FINISHED_STATUSES)[number]
        )
      ) {
        continue;
      }

      await ingestRawWithRetry(raw);
      fixturesUpserted += 1;
    }

    finishedCount = await countCompletedTeamFixturesByProviderId({
      teamProviderId,
      beforeAt,
    });
  }

  const teamUuid = await getTeamUuidByProviderId(teamProviderId);
  if (teamUuid) {
    await upsertTeamSyncState({
      teamProviderId,
      finishedCount,
      seasonsCovered: seasonsFetched,
      lastRepairSeasonYear,
      touchGapFill: true,
    });
    await refreshTeamSyncStateFromDb({ teamProviderId, teamUuid, beforeAt });
  }

  return {
    teamProviderId,
    skipped: false,
    apiRequests,
    fixturesUpserted,
    finishedCountAfter: finishedCount,
    seasonsFetched,
    lastRepairSeasonYear,
  };
}

export async function discoverRelevantTeamProviderIds(
  now = new Date()
): Promise<number[]> {
  const config = getIngestionConfig();
  const client = createAdminClient();

  const fromMs = now.getTime() - 7 * 86_400_000;
  const toMs = now.getTime() + 21 * 86_400_000;
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(toMs).toISOString();

  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return [];
  }

  const leagueIds = leagues.map((row) => row.id);
  const { data: fixtures, error } = await client
    .from("fixtures")
    .select(
      `
      home_team:teams!fixtures_home_team_id_fkey (provider_id),
      away_team:teams!fixtures_away_team_id_fkey (provider_id)
    `
    )
    .in("league_id", leagueIds)
    .gte("kickoff_at", fromIso)
    .lte("kickoff_at", toIso);

  if (error) {
    throw new Error(`Failed to discover relevant teams: ${error.message}`);
  }

  const ids = new Set<number>();
  for (const row of fixtures ?? []) {
    const home = Array.isArray(row.home_team)
      ? row.home_team[0]
      : row.home_team;
    const away = Array.isArray(row.away_team)
      ? row.away_team[0]
      : row.away_team;
    if (home?.provider_id != null) {
      ids.add(Number(home.provider_id));
    }
    if (away?.provider_id != null) {
      ids.add(Number(away.provider_id));
    }
  }

  return [...ids].sort((a, b) => a - b);
}

export type RunTeamHistoryRepairBatchResult = {
  ok: boolean;
  degraded?: boolean;
  teamsProcessed: number;
  teamsSkipped: number;
  apiRequests: number;
  fixturesUpserted: number;
  stoppedForTimeBudget?: boolean;
  candidateCount: number;
};

type RepairCheckpoint = {
  candidateTeamProviderIds: number[];
  nextIndex: number;
  asOfDate: string;
};

function parseRepairCheckpoint(
  cursor: Record<string, unknown> | null
): RepairCheckpoint | null {
  if (!cursor) {
    return null;
  }

  const ids = cursor.candidateTeamProviderIds;
  const nextIndex = cursor.nextIndex;
  const asOfDate = cursor.asOfDate;

  if (
    !Array.isArray(ids) ||
    typeof nextIndex !== "number" ||
    typeof asOfDate !== "string"
  ) {
    return null;
  }

  const candidateTeamProviderIds = ids.filter(
    (value): value is number => typeof value === "number"
  );

  if (candidateTeamProviderIds.length === 0) {
    return null;
  }

  return {
    candidateTeamProviderIds,
    nextIndex,
    asOfDate,
  };
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function runTeamHistoryRepairBatch(input?: {
  maxTeams?: number;
  budgetMs?: number;
}): Promise<RunTeamHistoryRepairBatchResult> {
  const startedAtMs = Date.now();
  const budget = createCronIngestBudget(startedAtMs, input?.budgetMs);
  const maxTeams =
    input?.maxTeams ??
    Number.parseInt(process.env.TEAM_HISTORY_REPAIR_BATCH_SIZE ?? "5", 10);

  const today = utcDateString(new Date());
  let checkpoint = parseRepairCheckpoint(
    await getJobCheckpoint(REPAIR_TEAM_HISTORY_JOB)
  );

  if (!checkpoint || checkpoint.asOfDate !== today) {
    const candidates = await discoverRelevantTeamProviderIds();
    checkpoint = {
      candidateTeamProviderIds: candidates,
      nextIndex: 0,
      asOfDate: today,
    };
    await upsertJobCheckpoint(REPAIR_TEAM_HISTORY_JOB, {
      ...checkpoint,
    });
  }

  let teamsProcessed = 0;
  let teamsSkipped = 0;
  let apiRequests = 0;
  let fixturesUpserted = 0;
  let stoppedForTimeBudget = false;

  while (
    checkpoint.nextIndex < checkpoint.candidateTeamProviderIds.length &&
    teamsProcessed < maxTeams &&
    !budget.exceeded()
  ) {
    const teamProviderId =
      checkpoint.candidateTeamProviderIds[checkpoint.nextIndex]!;
    checkpoint.nextIndex += 1;

    const result = await repairTeamHistory(teamProviderId);
    apiRequests += result.apiRequests;
    fixturesUpserted += result.fixturesUpserted;
    if (result.skipped) {
      teamsSkipped += 1;
    } else {
      teamsProcessed += 1;
    }

    if (budget.exceeded()) {
      stoppedForTimeBudget = true;
      break;
    }
  }

  await upsertJobCheckpoint(REPAIR_TEAM_HISTORY_JOB, {
    candidateTeamProviderIds: checkpoint.candidateTeamProviderIds,
    nextIndex: checkpoint.nextIndex,
    asOfDate: checkpoint.asOfDate,
  });

  if (checkpoint.nextIndex >= checkpoint.candidateTeamProviderIds.length) {
    await clearJobCheckpoint(REPAIR_TEAM_HISTORY_JOB);
  }

  return {
    ok: !stoppedForTimeBudget || teamsProcessed > 0,
    degraded: stoppedForTimeBudget,
    teamsProcessed,
    teamsSkipped,
    apiRequests,
    fixturesUpserted,
    stoppedForTimeBudget,
    candidateCount: checkpoint.candidateTeamProviderIds.length,
  };
}
