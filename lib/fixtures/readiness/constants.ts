import { formatDateKeyInTimezone } from "@/lib/datetime/timezone";
import { LINEUP_PUBLISH_LEAD_MS } from "@/lib/match/overview-hydrate-policy";
import { PREMATCH_FRESHNESS_MS } from "@/lib/models/version";
import {
  PREMATCH_LLM_ACTIVE_MS,
  PREMATCH_SCHEDULED_LEAD_MS,
} from "@/lib/ai/prematch-availability";
import { LIVE_STALE_PROVIDER_SYNC_MS } from "@/lib/live/live-presentation";
import { PAUSED_LIVE_POLL_INTERVAL_FACTOR } from "@/lib/fixtures/live-status";

export const LIFECYCLE_TIMEZONE = "Europe/Belgrade";

/** Lineups cron / warm imminent window (90 minutes). */
export const IMMINENT_BEFORE_KICKOFF_MS = 90 * 60_000;

export {
  PREMATCH_FRESHNESS_MS,
  PREMATCH_SCHEDULED_LEAD_MS,
  PREMATCH_LLM_ACTIVE_MS,
  LINEUP_PUBLISH_LEAD_MS,
  LIVE_STALE_PROVIDER_SYNC_MS,
  PAUSED_LIVE_POLL_INTERVAL_FACTOR,
};

export function getLifecycleTodayDateKey(now = new Date()): string {
  return formatDateKeyInTimezone(now, LIFECYCLE_TIMEZONE);
}
