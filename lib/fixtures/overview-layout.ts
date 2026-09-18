import type { FixtureStatus } from "@/types/domain";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

export type OverviewLayoutMode = "pre" | "live";

/** Which Overview panel implementation to render (SSR vs live client). */
export type MatchOverviewRenderMode = "pre" | "finished" | "live";

export type OverviewCardId =
  | "aiEngine"
  | "timeline"
  | "momentum"
  | "formPreview"
  | "matchDetails"
  | "standingsSnippet"
  | "h2hCompact"
  | "playersToWatch"
  | "lineupTeaser"
  | "playerOfMatch";

const PRE_MATCH_ORDER: OverviewCardId[] = [
  "aiEngine",
  "standingsSnippet",
  "h2hCompact",
  "formPreview",
  "matchDetails",
  "playersToWatch",
  "lineupTeaser",
];

const LIVE_IN_PROGRESS_ORDER: OverviewCardId[] = [
  "aiEngine",
  "timeline",
  "momentum",
  "matchDetails",
  "formPreview",
  "lineupTeaser",
];

const FINISHED_ORDER: OverviewCardId[] = [
  "aiEngine",
  "timeline",
  "momentum",
  "playerOfMatch",
  "matchDetails",
  "formPreview",
  "lineupTeaser",
];

export function getOverviewLayout(status: FixtureStatus): OverviewLayoutMode {
  if (isLiveFixtureStatus(status) || isFinishedFixtureStatus(status)) {
    return "live";
  }

  return "pre";
}

export function getMatchOverviewRenderMode(
  status: FixtureStatus
): MatchOverviewRenderMode {
  if (isLiveFixtureStatus(status)) {
    return "live";
  }

  if (isFinishedFixtureStatus(status)) {
    return "finished";
  }

  return "pre";
}

export function getOverviewCardOrder(
  renderMode: MatchOverviewRenderMode
): OverviewCardId[] {
  switch (renderMode) {
    case "pre":
      return PRE_MATCH_ORDER;
    case "live":
      return LIVE_IN_PROGRESS_ORDER;
    case "finished":
      return FINISHED_ORDER;
  }
}

export function isOverviewCardVisible(
  cardId: OverviewCardId,
  renderMode: MatchOverviewRenderMode
): boolean {
  return getOverviewCardOrder(renderMode).includes(cardId);
}
