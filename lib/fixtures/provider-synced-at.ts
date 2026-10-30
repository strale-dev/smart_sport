export const FIXTURE_SYNC_JOB_NAMES = [
  "sync-fixtures-today",
  "sync-fixtures",
] as const;

/** GitHub Actions cadence for sync-fixtures-today. */
export const FIXTURE_SYNC_CADENCE_MS = 15 * 60 * 1000;

/** Two missed cycles before a today/live window is treated as stale. */
export const FIXTURE_SYNC_STALE_AFTER_MS = 2 * FIXTURE_SYNC_CADENCE_MS;

const FIXTURE_SYNC_JOB_NAME_SET = new Set<string>(FIXTURE_SYNC_JOB_NAMES);

export type ProviderSyncSource =
  "ingestion_run" | "fixture_row" | "league_season" | "cache_envelope";

export type FixtureSyncRunEvidence = {
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  statsDate?: string | null;
};

export type ResolveProviderSyncedAtInput = {
  now: Date;
  todayDateKey: string;
  hasLiveFixture: boolean;
  windowFromDate: string;
  windowToDateExclusive: string;
  runs: FixtureSyncRunEvidence[];
  fixtureLastProviderSyncAt: Array<string | null | undefined>;
  leagueLastSyncAt: Array<string | null | undefined>;
  envelopeCachedAt?: string | null;
  persistedFixtureCount: number;
  metaStale: boolean;
};

export type ProviderSyncAnchor = {
  providerSyncedAt: string | null;
  providerSyncSource: ProviderSyncSource | null;
  freshnessStale: boolean;
  providerUnavailable: boolean;
};

export function windowIncludesToday(
  todayDateKey: string,
  windowFromDate: string,
  windowToDateExclusive: string
): boolean {
  return todayDateKey >= windowFromDate && todayDateKey < windowToDateExclusive;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    const parsed = parseTime(value);
    if (parsed == null || parsed <= bestMs) {
      continue;
    }

    bestMs = parsed;
    best = value ?? null;
  }

  return best;
}

function runApplies(
  run: FixtureSyncRunEvidence,
  windowFromDate: string,
  windowToDateExclusive: string
): boolean {
  if (!FIXTURE_SYNC_JOB_NAME_SET.has(run.jobName)) {
    return false;
  }

  if (!run.statsDate) {
    return true;
  }

  return (
    run.statsDate >= windowFromDate && run.statsDate < windowToDateExclusive
  );
}

function newestRun(
  runs: FixtureSyncRunEvidence[]
): FixtureSyncRunEvidence | null {
  let best: FixtureSyncRunEvidence | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;

  for (const run of runs) {
    const startedMs = parseTime(run.startedAt) ?? Number.NEGATIVE_INFINITY;
    if (startedMs < bestMs) {
      continue;
    }

    best = run;
    bestMs = startedMs;
  }

  return best;
}

export function resolveProviderSyncedAt(
  input: ResolveProviderSyncedAtInput
): ProviderSyncAnchor {
  const applicable = input.runs.filter((run) =>
    runApplies(run, input.windowFromDate, input.windowToDateExclusive)
  );
  const newest = newestRun(applicable);
  const completeFinishedAt = maxIso(
    applicable
      .filter((run) => run.status === "complete")
      .map((run) => run.finishedAt)
  );

  let providerSyncedAt: string | null = null;
  let providerSyncSource: ProviderSyncSource | null = null;

  if (completeFinishedAt) {
    providerSyncedAt = completeFinishedAt;
    providerSyncSource = "ingestion_run";
  } else {
    const fixtureSync = maxIso(input.fixtureLastProviderSyncAt);
    const leagueSync = maxIso(input.leagueLastSyncAt);

    if (fixtureSync) {
      providerSyncedAt = fixtureSync;
      providerSyncSource = "fixture_row";
    } else if (leagueSync) {
      providerSyncedAt = leagueSync;
      providerSyncSource = "league_season";
    } else if (parseTime(input.envelopeCachedAt) != null) {
      providerSyncedAt = input.envelopeCachedAt ?? null;
      providerSyncSource = "cache_envelope";
    }
  }

  const ageApplies =
    windowIncludesToday(
      input.todayDateKey,
      input.windowFromDate,
      input.windowToDateExclusive
    ) || input.hasLiveFixture;
  const syncedMs = parseTime(providerSyncedAt);
  const ageStale =
    ageApplies &&
    (syncedMs == null ||
      input.now.getTime() - syncedMs >= FIXTURE_SYNC_STALE_AFTER_MS);
  const freshnessStale =
    input.metaStale || newest?.status === "failed" || ageStale;

  const providerUnavailable =
    input.persistedFixtureCount === 0 &&
    (newest?.status === "failed" ||
      (providerSyncSource !== "ingestion_run" &&
        providerSyncSource !== "fixture_row" &&
        providerSyncSource !== "league_season"));

  return {
    providerSyncedAt,
    providerSyncSource,
    freshnessStale,
    providerUnavailable,
  };
}
