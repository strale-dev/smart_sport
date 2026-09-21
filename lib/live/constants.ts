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

import {
  findLeagueTab,
  getAllLeagueTabProviderIds,
  getLeagueLogoUrl,
  getMoreLeagueTabs,
  getPrimaryLeagueTabs,
} from "@/lib/competitions/index";

export { getLeagueLogoUrl };

export const LIVE_LEAGUE_TABS = getPrimaryLeagueTabs();
export const LIVE_LEAGUE_MORE = getMoreLeagueTabs();
export const LIVE_LEAGUE_PROVIDER_IDS = getAllLeagueTabProviderIds();

export function findLiveLeagueTab(providerId: number) {
  return findLeagueTab(providerId);
}
