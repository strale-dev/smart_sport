import type { FixtureStatus } from "@/types/domain";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

export type OverviewLayoutMode = "pre" | "live";

export type OverviewCardId =
  "timeline" | "momentum" | "liveStats" | "comparison" | "playersToWatch";

const PRE_MATCH_ORDER: OverviewCardId[] = ["comparison", "playersToWatch"];

const LIVE_MATCH_ORDER: OverviewCardId[] = [
  "timeline",
  "momentum",
  "liveStats",
  "comparison",
  "playersToWatch",
];

export function getOverviewLayout(status: FixtureStatus): OverviewLayoutMode {
  if (isLiveFixtureStatus(status) || isFinishedFixtureStatus(status)) {
    return "live";
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
