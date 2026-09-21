import { getEnabledProviderIds } from "@/lib/competitions/index";
import { LEGACY_CORE_PROVIDER_IDS } from "@/lib/competitions/legacy";
import { FIXTURES_WINDOW_DAYS } from "@/lib/fixtures/constants";
import { parsePublicEnv } from "@/lib/env";

/** Dev/default subset — same IDs as pre-expansion production allowlist. */
export const INGESTION_LEAGUE_PROVIDER_IDS = LEGACY_CORE_PROVIDER_IDS;

export type IngestionLeagueProviderId =
  (typeof INGESTION_LEAGUE_PROVIDER_IDS)[number];

function parseProviderIdList(raw: string | undefined): number[] | null {
  if (!raw?.trim()) {
    return null;
  }

  const ids = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value));

  return ids.length > 0 ? ids : null;
}

/** Production uses full registry; local dev defaults to legacy 11 unless overridden. */
export function resolveIngestionLeagueProviderIds(
  source: Record<string, string | undefined> = process.env
): readonly number[] {
  const explicit = parseProviderIdList(source.INGESTION_LEAGUE_PROVIDER_IDS);
  if (explicit) {
    return explicit;
  }

  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);
  if (
    source.INGESTION_USE_FULL_REGISTRY === "true" ||
    NEXT_PUBLIC_APP_ENV === "production"
  ) {
    return getEnabledProviderIds();
  }

  return INGESTION_LEAGUE_PROVIDER_IDS;
}

export type IngestionConfig = {
  leagueProviderIds: readonly number[];
  fixtureWindowDays: number;
  standingsFreshnessHours: number;
  providerThrottleMs: number;
  lineupsSyncEnabled: boolean;
  lineupsSyncBatch: number;
  isDevelopment: boolean;
};

const DEFAULT_LINEUPS_SYNC_BATCH = 30;

export function resolveLineupsSyncEnabled(
  isDevelopment: boolean,
  source: Record<string, string | undefined>
): boolean {
  const flag = source.API_FOOTBALL_LINEUPS_SYNC_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !isDevelopment;
}

function resolveLineupsSyncBatch(
  source: Record<string, string | undefined>
): number {
  const raw = source.LINEUPS_SYNC_BATCH;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_LINEUPS_SYNC_BATCH;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_LINEUPS_SYNC_BATCH;
}

const TERMINAL_FIXTURE_STATUSES = new Set([
  "FT",
  "AET",
  "PEN",
  "CANC",
  "ABD",
  "PST",
  "WO",
  "AWD",
]);

export function isTerminalFixtureStatus(status: string): boolean {
  return TERMINAL_FIXTURE_STATUSES.has(status);
}

export function getIngestionConfig(
  source: Record<string, string | undefined> = process.env
): IngestionConfig {
  const { NEXT_PUBLIC_APP_ENV } = parsePublicEnv(source);
  const isDevelopment = NEXT_PUBLIC_APP_ENV === "development";

  return {
    leagueProviderIds: resolveIngestionLeagueProviderIds(source),
    fixtureWindowDays: isDevelopment ? FIXTURES_WINDOW_DAYS : 7,
    standingsFreshnessHours: isDevelopment ? 20 : 5,
    providerThrottleMs: isDevelopment ? 6_500 : 250,
    lineupsSyncEnabled: resolveLineupsSyncEnabled(isDevelopment, source),
    lineupsSyncBatch: resolveLineupsSyncBatch(source),
    isDevelopment,
  };
}

export function isLeagueInAllowlist(
  leagueProviderId: number,
  config: IngestionConfig = getIngestionConfig()
): boolean {
  return config.leagueProviderIds.includes(leagueProviderId);
}

export function isLineupsSyncEnabled(
  source: Record<string, string | undefined> = process.env
): boolean {
  return getIngestionConfig(source).lineupsSyncEnabled;
}

export function buildFixtureDateWindow(
  anchor = new Date(),
  windowDays = getIngestionConfig().fixtureWindowDays
): string[] {
  const dates: string[] = [];
  const base = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth(),
    anchor.getUTCDate()
  );

  for (let offset = -windowDays; offset <= windowDays; offset += 1) {
    const day = new Date(base + offset * 86_400_000);
    dates.push(day.toISOString().slice(0, 10));
  }

  return dates;
}

export function isTodayOrTomorrowUtc(
  date: string,
  anchor = new Date()
): boolean {
  const today = anchor.toISOString().slice(0, 10);
  const tomorrow = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() + 1
    )
  )
    .toISOString()
    .slice(0, 10);

  return date === today || date === tomorrow;
}
