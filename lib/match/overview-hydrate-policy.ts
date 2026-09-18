import type { MatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";

export const FORM_LOOKBACK_MATCHES = 8;
export const MIN_FORM_MATCHES = 3;
export const RECENT_PLAYER_FORM_MATCHES = 3;

export function shouldIngestLiveOrFinishedDetails(input: {
  renderMode: MatchOverviewRenderMode;
  hasEvents: boolean;
  hasPlayerPerformances: boolean;
}): boolean {
  if (input.renderMode === "pre") {
    return false;
  }

  return !input.hasEvents || !input.hasPlayerPerformances;
}

/** Providers publish lineups roughly an hour before kickoff. */
export const LINEUP_PUBLISH_LEAD_MS = 60 * 60 * 1000;

export function shouldIngestLineups(input: {
  hasLineups: boolean;
  kickoffAt: string;
  now?: number;
}): boolean {
  if (input.hasLineups) {
    return false;
  }

  const kickoffMs = Date.parse(input.kickoffAt);
  if (Number.isNaN(kickoffMs)) {
    return false;
  }

  const now = input.now ?? Date.now();
  return kickoffMs - now <= LINEUP_PUBLISH_LEAD_MS;
}

export function shouldFillTeamForm(finishedMatchCount: number): boolean {
  return finishedMatchCount < MIN_FORM_MATCHES;
}
