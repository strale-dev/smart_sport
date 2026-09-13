import type { FixtureStatus } from "@/types/domain";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

export type OverviewLayoutMode = "pre" | "live";

/** Which Overview panel implementation to render (SSR vs live client). */
export type MatchOverviewRenderMode = "pre" | "finished" | "live";

export type OverviewCardId =
  | "probabilityDelta"
  | "timeline"
  | "momentum"
  | "liveStats"
  | "formPreview"
  | "h2hPreview"
  | "comparison"
  | "playersToWatch"
  | "lineupTeaser";

const PRE_MATCH_ORDER: OverviewCardId[] = [
  "comparison",
  "formPreview",
  "h2hPreview",
  "playersToWatch",
  "lineupTeaser",
];

const LIVE_MATCH_ORDER: OverviewCardId[] = [
  "probabilityDelta",
  "liveStats",
  "momentum",
  "comparison",
  "timeline",
  "playersToWatch",
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
  mode: OverviewLayoutMode
): OverviewCardId[] {
  return mode === "live" ? LIVE_MATCH_ORDER : PRE_MATCH_ORDER;
}

export function isOverviewCardVisible(
  cardId: OverviewCardId,
  mode: OverviewLayoutMode
): boolean {
  return getOverviewCardOrder(mode).includes(cardId);
}
