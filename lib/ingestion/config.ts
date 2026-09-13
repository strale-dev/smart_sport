import { parsePublicEnv } from "@/lib/env";

/** API-Football league IDs synced during development (Free key budget). */
export const INGESTION_LEAGUE_PROVIDER_IDS = [
  39, // Premier League
  140, // La Liga
  135, // Serie A
  78, // Bundesliga
  61, // Ligue 1
  2, // UEFA Champions League
  286, // Super Liga (Serbia)
] as const;

export type IngestionLeagueProviderId =
  (typeof INGESTION_LEAGUE_PROVIDER_IDS)[number];

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
    leagueProviderIds: INGESTION_LEAGUE_PROVIDER_IDS,
    fixtureWindowDays: isDevelopment ? 1 : 7,
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
