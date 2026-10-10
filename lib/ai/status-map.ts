import {
  FINISHED_FIXTURE_STATUSES,
  LIVE_FIXTURE_STATUSES,
  NEITHER_FIXTURE_STATUSES,
  PREMATCH_FIXTURE_STATUSES,
} from "@/lib/fixtures/live-status";
import type { FixtureStatus } from "@/types/domain";

export type FixturePhase = "PREMATCH" | "LIVE" | "FINISHED" | "NEITHER";

/** @deprecated Use PREMATCH_FIXTURE_STATUSES from live-status */
export const PREMATCH_STATUSES = PREMATCH_FIXTURE_STATUSES;

/** @deprecated Use LIVE_FIXTURE_STATUSES from live-status */
export const LIVE_STATUSES = LIVE_FIXTURE_STATUSES;

/** @deprecated Use FINISHED_FIXTURE_STATUSES from live-status */
export const FINISHED_STATUSES = FINISHED_FIXTURE_STATUSES;

/** @deprecated Use NEITHER_FIXTURE_STATUSES from live-status */
export const NEITHER_STATUSES = NEITHER_FIXTURE_STATUSES;

export function resolveFixturePhase(status: string): FixturePhase {
  if (PREMATCH_STATUSES.has(status as FixtureStatus)) {
    return "PREMATCH";
  }

  if (LIVE_STATUSES.has(status as FixtureStatus)) {
    return "LIVE";
  }

  if (FINISHED_STATUSES.has(status as FixtureStatus)) {
    return "FINISHED";
  }

  return "NEITHER";
}

export function canGeneratePrematchInsight(status: string): boolean {
  return resolveFixturePhase(status) === "PREMATCH";
}

/** One stored pre-match narrative may be created after kickoff when none exists. */
export function canBackfillMissingPrematchInsight(status: string): boolean {
  const phase = resolveFixturePhase(status);
  return phase === "LIVE" || phase === "FINISHED";
}

export type HistoricalPrematchWriteAction =
  "return_stored" | "backfill" | "guest_forbidden" | "generation_not_allowed";

/**
 * Live and finished fixtures never regenerate when a pre-match row already exists.
 * Cron may create the first row when none exists (backfill scope).
 */
export function historicalPrematchWriteAction(input: {
  trigger: "user" | "cron";
  hasUserId: boolean;
  hasStoredPrematch: boolean;
  contextHashMatches?: boolean;
}): HistoricalPrematchWriteAction {
  if (input.hasStoredPrematch) {
    if (input.contextHashMatches === false) {
      return "generation_not_allowed";
    }
    return "return_stored";
  }

  if (input.trigger === "user" && !input.hasUserId) {
    return "guest_forbidden";
  }

  if (input.trigger === "user" || input.trigger === "cron") {
    return "backfill";
  }

  return "generation_not_allowed";
}

export function isHistoricalInsightOnly(status: string): boolean {
  const phase = resolveFixturePhase(status);
  return phase === "LIVE" || phase === "FINISHED";
}

export function isFixtureAnalyzable(status: string): boolean {
  return resolveFixturePhase(status) !== "NEITHER";
}
