import { listFixturesByDate } from "@/lib/api-football/endpoints";
import { getInMemoryQuotaSnapshot } from "@/lib/api-football/quota";
import {
  getApiFootballDailyLimit,
  hasApiFootballConfig,
  hasRedisConfig,
  isApiFootballIngestOnly,
  parsePublicEnv,
} from "@/lib/env";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { PINNED_MATCH_QA_FIXTURES } from "@/lib/qa/pinned-fixture-ids";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FixtureStatus } from "@/types/domain";

/** FT fixtures used for dev QA bootstrap (ROADMAP manual URLs). */
export const DEV_QA_BOOTSTRAP_FIXTURE_IDS = [
  PINNED_MATCH_QA_FIXTURES.ftWithXg,
  1552750,
  PINNED_MATCH_QA_FIXTURES.ftWithoutXg,
] as const;

export type IngestionEnvSummary = {
  appEnv: string;
  ingestOnly: boolean;
  hasApiFootballKey: boolean;
  hasSupabaseServiceRole: boolean;
  hasRedis: boolean;
  apiFootballDailyLimit: number;
};

export type IngestionConfigSummary = {
  fixtureWindowDays: number;
  providerThrottleMs: number;
  lineupsSyncEnabled: boolean;
  leagueCount: number;
};

export type IngestionGlobalCounts = {
  leagues: number;
  seasons: number;
  fixtures: number;
  standings: number;
  fixtureEvents: number;
};

export type FixturesTodayUtc = {
  count: number;
  sampleProviderIds: number[];
};

export type FixtureIngestionReport = {
  providerId: number;
  label: string;
  inDatabase: boolean;
  status: string | null;
  statRows: number;
  eventRows: number;
  lineupRows: number;
  matchPath: string;
  overviewRenderMode: string | null;
  overviewExpectsDbData: boolean;
  overviewHasData: boolean;
};

export type IngestionGapId =
  | "missing_api_football_key"
  | "missing_supabase_service_role"
  | "missing_static_metadata"
  | "missing_fixtures_today"
  | "pinned_fixture_not_in_db"
  | "pinned_ft_missing_overview_data";

export type IngestionGap = {
  id: IngestionGapId;
  message: string;
  severity: "error" | "warning";
};

export type IngestDevQaStep = "static" | "fixtures" | "match_details";

export type IngestionDiagnosis = {
  env: IngestionEnvSummary;
  config: IngestionConfigSummary;
  globalCounts: IngestionGlobalCounts;
  fixturesTodayUtc: FixturesTodayUtc;
  pinnedReports: FixtureIngestionReport[];
  extraFixtureReport: FixtureIngestionReport | null;
  gaps: IngestionGap[];
  recommendedCommands: string[];
  strictWouldFail: boolean;
  ingestDevQaSteps: IngestDevQaStep[];
};

export type ApiFootballProbeResult =
  | {
      skipped: true;
      reason: string;
    }
  | {
      skipped: false;
      ok: true;
      fixturesTodayFromApi: number;
      quota: ReturnType<typeof getInMemoryQuotaSnapshot>;
      dailyLimit: number;
    }
  | {
      skipped: false;
      ok: false;
      error: string;
    };

export function buildEnvSummary(
  source: Record<string, string | undefined> = process.env
): IngestionEnvSummary {
  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);

  return {
    appEnv: NEXT_PUBLIC_APP_ENV,
    ingestOnly: isApiFootballIngestOnly(source),
    hasApiFootballKey: hasApiFootballConfig(source),
    hasSupabaseServiceRole: Boolean(source.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    hasRedis: hasRedisConfig(source),
    apiFootballDailyLimit: getApiFootballDailyLimit(source),
  };
}

export function buildConfigSummary(
  source: Record<string, string | undefined> = process.env
): IngestionConfigSummary {
  const config = getIngestionConfig(source);

  return {
    fixtureWindowDays: config.fixtureWindowDays,
    providerThrottleMs: config.providerThrottleMs,
    lineupsSyncEnabled: config.lineupsSyncEnabled,
    leagueCount: config.leagueProviderIds.length,
  };
}

export type DeriveGapsInput = {
  env: IngestionEnvSummary;
  globalCounts: IngestionGlobalCounts;
  fixturesTodayUtc: FixturesTodayUtc;
  pinnedReports: FixtureIngestionReport[];
};

export function deriveIngestionGaps(input: DeriveGapsInput): IngestionGap[] {
  const gaps: IngestionGap[] = [];

  if (!input.env.hasApiFootballKey) {
    gaps.push({
      id: "missing_api_football_key",
      message:
        "API_FOOTBALL_KEY is missing — sync and bootstrap require a provider key.",
      severity: "warning",
    });
  }

  if (!input.env.hasSupabaseServiceRole) {
    gaps.push({
      id: "missing_supabase_service_role",
      message:
        "SUPABASE_SERVICE_ROLE_KEY is missing — Postgres ingestion reads will fail.",
      severity: "error",
    });
  }

  if (input.globalCounts.leagues === 0 || input.globalCounts.seasons === 0) {
    gaps.push({
      id: "missing_static_metadata",
      message:
        "Leagues or seasons table is empty — run bootstrap:static-data (or ingest:dev-qa).",
      severity: "error",
    });
  }

  if (input.fixturesTodayUtc.count <= 0) {
    gaps.push({
      id: "missing_fixtures_today",
      message:
        "No fixtures with kickoff on UTC today — run sync:fixtures (or ingest:dev-qa).",
      severity: "error",
    });
  }

  const pinnedFt = input.pinnedReports.find(
    (row) => row.providerId === PINNED_MATCH_QA_FIXTURES.ftWithXg
  );

  if (pinnedFt && !pinnedFt.inDatabase) {
    gaps.push({
      id: "pinned_fixture_not_in_db",
      message: `Pinned FT QA fixture ${PINNED_MATCH_QA_FIXTURES.ftWithXg} is not in Postgres — sync fixtures for its date/league.`,
      severity: "warning",
    });
  }

  if (
    pinnedFt?.inDatabase &&
    pinnedFt.overviewExpectsDbData &&
    !pinnedFt.overviewHasData
  ) {
    gaps.push({
      id: "pinned_ft_missing_overview_data",
      message: `Pinned FT ${PINNED_MATCH_QA_FIXTURES.ftWithXg} lacks stats/events for Overview — run bootstrap:match-details (or ingest:dev-qa).`,
      severity: "error",
    });
  }

  return gaps;
}

export function buildRecommendedCommands(gaps: IngestionGap[]): string[] {
  const commands = new Set<string>();
  const gapIds = new Set(gaps.map((gap) => gap.id));

  if (gapIds.has("missing_api_football_key")) {
    commands.add("# Add API_FOOTBALL_KEY to .env.local");
    commands.add("npm.cmd run api-football:smoke");
  }

  if (gapIds.has("missing_static_metadata")) {
    commands.add("npm.cmd run bootstrap:static-data");
  }

  if (
    gapIds.has("missing_fixtures_today") ||
    gapIds.has("pinned_fixture_not_in_db")
  ) {
    commands.add("npm.cmd run sync:fixtures");
  }

  if (gapIds.has("pinned_ft_missing_overview_data")) {
    commands.add(
      `npm.cmd run bootstrap:match-details -- --fixture-ids=${DEV_QA_BOOTSTRAP_FIXTURE_IDS.join(",")}`
    );
  }

  commands.add("npm.cmd run diagnose:ingestion -- --strict");
  commands.add("npm.cmd run ingest:dev-qa");

  return [...commands];
}

export function computeStrictWouldFail(
  fixturesTodayUtc: FixturesTodayUtc,
  pinnedReports: FixtureIngestionReport[]
): boolean {
  if (fixturesTodayUtc.count <= 0) {
    return true;
  }

  const pinnedFt = pinnedReports.find(
    (row) => row.providerId === PINNED_MATCH_QA_FIXTURES.ftWithXg
  );

  if (!pinnedFt?.inDatabase) {
    return true;
  }

  if (pinnedFt.overviewExpectsDbData && !pinnedFt.overviewHasData) {
    return true;
  }

  return false;
}

export function planIngestDevQaSteps(input: {
  globalCounts: IngestionGlobalCounts;
  fixturesTodayUtc: FixturesTodayUtc;
  pinnedReports: FixtureIngestionReport[];
  force: boolean;
  skipStatic: boolean;
  skipMatchDetails: boolean;
}): IngestDevQaStep[] {
  if (input.force) {
    const steps: IngestDevQaStep[] = [];
    if (!input.skipStatic) {
      steps.push("static");
    }
    steps.push("fixtures");
    if (!input.skipMatchDetails) {
      steps.push("match_details");
    }
    return steps;
  }

  const steps: IngestDevQaStep[] = [];

  if (
    !input.skipStatic &&
    (input.globalCounts.leagues === 0 || input.globalCounts.seasons === 0)
  ) {
    steps.push("static");
  }

  if (input.fixturesTodayUtc.count <= 0) {
    steps.push("fixtures");
  }

  if (!input.skipMatchDetails) {
    const pinnedFt = input.pinnedReports.find(
      (row) => row.providerId === PINNED_MATCH_QA_FIXTURES.ftWithXg
    );

    if (
      pinnedFt?.inDatabase &&
      pinnedFt.overviewExpectsDbData &&
      !pinnedFt.overviewHasData
    ) {
      steps.push("match_details");
    }
  }

  return steps;
}

function utcTodayBounds(): { start: string; end: string; date: string } {
  const date = new Date().toISOString().slice(0, 10);
  const dayEnd = new Date(`${date}T00:00:00.000Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return {
    date,
    start: `${date}T00:00:00.000Z`,
    end: dayEnd.toISOString(),
  };
}

async function countTable(
  table: "leagues" | "seasons" | "fixtures" | "standings" | "fixture_events"
): Promise<number> {
  const client = createAdminClient();
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function loadFixturesTodayUtc(): Promise<FixturesTodayUtc> {
  const client = createAdminClient();
  const { start, end } = utcTodayBounds();

  const { count, error: countError } = await client
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .gte("kickoff_at", start)
    .lt("kickoff_at", end);

  if (countError) {
    throw new Error(`Failed to count fixtures today: ${countError.message}`);
  }

  const { data, error: sampleError } = await client
    .from("fixtures")
    .select("provider_id")
    .gte("kickoff_at", start)
    .lt("kickoff_at", end)
    .order("kickoff_at", { ascending: true })
    .limit(5);

  if (sampleError) {
    throw new Error(`Failed to sample fixtures today: ${sampleError.message}`);
  }

  return {
    count: count ?? 0,
    sampleProviderIds: (data ?? []).map((row) => row.provider_id),
  };
}

async function loadFixtureIngestionReport(
  providerId: number,
  label: string
): Promise<FixtureIngestionReport> {
  const client = createAdminClient();
  const matchPath = `/matches/${providerId}`;

  const { data: fixtureRow, error: fixtureError } = await client
    .from("fixtures")
    .select("id, status")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (fixtureError) {
    throw new Error(
      `Failed to load fixture ${providerId}: ${fixtureError.message}`
    );
  }

  if (!fixtureRow) {
    return {
      providerId,
      label,
      inDatabase: false,
      status: null,
      statRows: 0,
      eventRows: 0,
      lineupRows: 0,
      matchPath,
      overviewRenderMode: null,
      overviewExpectsDbData: false,
      overviewHasData: false,
    };
  }

  const [stats, events, lineups] = await Promise.all([
    client
      .from("fixture_statistics")
      .select("id", { count: "exact", head: true })
      .eq("fixture_id", fixtureRow.id),
    client
      .from("fixture_events")
      .select("id", { count: "exact", head: true })
      .eq("fixture_id", fixtureRow.id),
    client
      .from("lineups")
      .select("id", { count: "exact", head: true })
      .eq("fixture_id", fixtureRow.id),
  ]);

  const statRows = stats.count ?? 0;
  const eventRows = events.count ?? 0;
  const lineupRows = lineups.count ?? 0;
  const status = fixtureRow.status as FixtureStatus;
  const overviewRenderMode = getMatchOverviewRenderMode(status);
  const overviewExpectsDbData = overviewRenderMode !== "pre";
  const overviewHasData =
    overviewRenderMode === "pre" || statRows > 0 || eventRows > 0;

  return {
    providerId,
    label,
    inDatabase: true,
    status: fixtureRow.status,
    statRows,
    eventRows,
    lineupRows,
    matchPath,
    overviewRenderMode,
    overviewExpectsDbData,
    overviewHasData,
  };
}

const PINNED_LABELS: Record<number, string> = {
  [PINNED_MATCH_QA_FIXTURES.ftWithXg]: "ftWithXg",
  [PINNED_MATCH_QA_FIXTURES.ftWithoutXg]: "ftWithoutXg",
  [PINNED_MATCH_QA_FIXTURES.nsNoLineups]: "nsNoLineups",
};

export async function runIngestionDiagnosis(options?: {
  extraFixtureId?: number;
  envSource?: Record<string, string | undefined>;
  ingestDevQaForce?: boolean;
  ingestDevQaSkipStatic?: boolean;
  ingestDevQaSkipMatchDetails?: boolean;
}): Promise<IngestionDiagnosis> {
  const envSource = options?.envSource ?? process.env;
  const env = buildEnvSummary(envSource);
  const config = buildConfigSummary(envSource);

  const [
    leagues,
    seasons,
    fixtures,
    standings,
    fixtureEvents,
    fixturesTodayUtc,
  ] = await Promise.all([
    countTable("leagues"),
    countTable("seasons"),
    countTable("fixtures"),
    countTable("standings"),
    countTable("fixture_events"),
    loadFixturesTodayUtc(),
  ]);

  const globalCounts: IngestionGlobalCounts = {
    leagues,
    seasons,
    fixtures,
    standings,
    fixtureEvents,
  };

  const pinnedIds = Object.values(PINNED_MATCH_QA_FIXTURES);
  const pinnedReports = await Promise.all(
    pinnedIds.map((providerId) =>
      loadFixtureIngestionReport(
        providerId,
        PINNED_LABELS[providerId] ?? String(providerId)
      )
    )
  );

  let extraFixtureReport: FixtureIngestionReport | null = null;
  if (
    options?.extraFixtureId != null &&
    Number.isFinite(options.extraFixtureId)
  ) {
    extraFixtureReport = await loadFixtureIngestionReport(
      options.extraFixtureId,
      "cli"
    );
  }

  const gaps = deriveIngestionGaps({
    env,
    globalCounts,
    fixturesTodayUtc,
    pinnedReports,
  });

  const recommendedCommands = buildRecommendedCommands(gaps);
  const strictWouldFail = computeStrictWouldFail(
    fixturesTodayUtc,
    pinnedReports
  );

  const ingestDevQaSteps = planIngestDevQaSteps({
    globalCounts,
    fixturesTodayUtc,
    pinnedReports,
    force: options?.ingestDevQaForce ?? false,
    skipStatic: options?.ingestDevQaSkipStatic ?? false,
    skipMatchDetails: options?.ingestDevQaSkipMatchDetails ?? false,
  });

  return {
    env,
    config,
    globalCounts,
    fixturesTodayUtc,
    pinnedReports,
    extraFixtureReport,
    gaps,
    recommendedCommands,
    strictWouldFail,
    ingestDevQaSteps,
  };
}

export async function probeApiFootballQuota(): Promise<ApiFootballProbeResult> {
  if (!hasApiFootballConfig(process.env)) {
    return {
      skipped: true,
      reason: "API_FOOTBALL_KEY not set — provider probe skipped.",
    };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const fixtures = await listFixturesByDate(today);
    const quota = getInMemoryQuotaSnapshot();
    const dailyLimit = getApiFootballDailyLimit();

    return {
      skipped: false,
      ok: true,
      fixturesTodayFromApi: fixtures.length,
      quota,
      dailyLimit,
    };
  } catch (error) {
    return {
      skipped: false,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resolveMatchDetailsBootstrapTargets(): Promise<number[]> {
  const client = createAdminClient();
  const pinnedInDb: number[] = [];

  for (const providerId of DEV_QA_BOOTSTRAP_FIXTURE_IDS) {
    const { data } = await client
      .from("fixtures")
      .select("provider_id")
      .eq("provider_id", providerId)
      .maybeSingle();

    if (data) {
      pinnedInDb.push(providerId);
    }
  }

  if (pinnedInDb.length > 0) {
    return pinnedInDb;
  }

  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await client
    .from("fixtures")
    .select("provider_id")
    .in("status", ["FT", "AET", "PEN"])
    .gte("kickoff_at", cutoff)
    .order("kickoff_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Failed to resolve FT fallback fixtures: ${error.message}`);
  }

  return (data ?? []).map((row) => row.provider_id);
}
