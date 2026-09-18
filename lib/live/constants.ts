/** Live Center page size per PRD §6.3. */
export const LIVE_PAGE_SIZE = 20;

/** Hours ahead to show "Starting soon" when no live matches. */
export const UPCOMING_SOON_HOURS = 3;

/** Max upcoming fixtures shown in empty state. */
export const UPCOMING_SOON_LIMIT = 8;

/** Client polling interval in milliseconds. */
export const LIVE_POLL_INTERVAL_MS = 30_000;

/** React Query fallback when Realtime broadcast is missed (tab visible). */
export const LIVE_FALLBACK_REFETCH_MS = 60_000;

/** Snapshot polling while Supabase Realtime is unhealthy (match page). */
export const LIVE_REALTIME_DOWN_REFETCH_MS = 45_000;

/** Per-fixture lock while running detector + ingest tick (prevents overlapping reads). */
export const LIVE_DETECTOR_TICK_LOCK_SEC = 8;

/** Redis TTL for last detector snapshot per fixture. */
export const LIVE_DETECTOR_SNAPSHOT_TTL_SEC = 86_400;

/** Server provider poll cadence (ms). */
export const LIVE_SERVER_POLL_MIN_MS = 30_000;
export const LIVE_SERVER_POLL_MAX_MS = 40_000;

/** Redis lock TTL for live poll workers (renewed each tick). */
export const LIVE_POLL_LOCK_TTL_SEC = 90;

/** Grace period after last viewer leaves before stopping poll. */
export const LIVE_PRESENCE_GRACE_MS = 60_000;

/** Watch token TTL; extended on heartbeat. */
export const LIVE_WATCH_TOKEN_TTL_SEC = 120;

/** Client heartbeat while watching live (match / live-center). */
export const LIVE_USER_ACTIVE_WATCH_HEARTBEAT_MS = 30_000;

export const LIVE_USER_ACTIVE_WATCH_HEARTBEAT_SEC = 30;

/** Redis TTL for live:user:{userId}:active (2× heartbeat). */
export const LIVE_USER_ACTIVE_WATCH_TTL_SEC = 60;

export const LIVE_INTERNAL_POLL_TICK_PATH = "/api/internal/live/poll-tick";
export const LIVE_INTERNAL_POLL_CENTER_TICK_PATH =
  "/api/internal/live/poll-center-tick";
export const LIVE_INTERNAL_FOLLOW_NOTIFICATION_POLL_TICK_PATH =
  "/api/internal/live/follow-notification-poll-tick";

/** Max concurrent follow-notification poll chains (API budget guard). */
export const FOLLOW_NOTIFICATION_MAX_CONCURRENT_POLLS = 8;

export type LiveWatchSurface = "match" | "live-center";

/** Status filter options exposed in Live Center UI. */
export const LIVE_STATUS_FILTERS = ["1H", "HT", "2H", "ET"] as const;

export type LiveStatusFilter = (typeof LIVE_STATUS_FILTERS)[number];

export type LiveLeagueTab = {
  providerId: number;
  label: string;
  shortLabel?: string;
};

/** API-Sports league logo URL for filter tabs. */
export function getLeagueLogoUrl(providerId: number): string {
  return `https://media.api-sports.io/football/leagues/${providerId}.png`;
}

/** Top leagues shown as primary tabs (prestige order). */
export const LIVE_LEAGUE_TABS: LiveLeagueTab[] = [
  { providerId: 39, label: "Premier League", shortLabel: "EPL" },
  { providerId: 140, label: "La Liga" },
  { providerId: 135, label: "Serie A" },
  { providerId: 78, label: "Bundesliga", shortLabel: "BL" },
  { providerId: 61, label: "Ligue 1" },
  { providerId: 2, label: "Champions League", shortLabel: "UCL" },
  { providerId: 3, label: "Europa League", shortLabel: "UEL" },
  { providerId: 848, label: "Conference League", shortLabel: "UECL" },
];

/** Leagues shown in the "More" dropdown. */
export const LIVE_LEAGUE_MORE: LiveLeagueTab[] = [
  { providerId: 94, label: "Primeira Liga" },
  { providerId: 88, label: "Eredivisie" },
  { providerId: 286, label: "Super Liga" },
];

export const LIVE_LEAGUE_PROVIDER_IDS = new Set([
  ...LIVE_LEAGUE_TABS.map((tab) => tab.providerId),
  ...LIVE_LEAGUE_MORE.map((tab) => tab.providerId),
]);

export function findLiveLeagueTab(
  providerId: number
): LiveLeagueTab | undefined {
  return (
    LIVE_LEAGUE_TABS.find((tab) => tab.providerId === providerId) ??
    LIVE_LEAGUE_MORE.find((tab) => tab.providerId === providerId)
  );
}
