import type { MatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import type { FixtureEvent, FixtureTeamStatistics } from "@/types/domain";

export function shouldReuseLiveOverviewSnapshot(
  renderMode: MatchOverviewRenderMode,
  liveSnapshot: MatchLiveSnapshot | null | undefined
): boolean {
  return renderMode === "live" && liveSnapshot != null;
}

export type OverviewDbSlice = {
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
};

/** True when overview should show stats/timeline content (not false empty states). */
export function overviewHasRenderableMatchData({
  renderMode,
  events,
  statistics,
}: {
  renderMode: MatchOverviewRenderMode;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
}): boolean {
  if (renderMode === "pre") {
    return true;
  }

  const hasStats = statistics.length > 0;
  const hasEvents = events.length > 0;

  if (renderMode === "finished") {
    return hasStats || hasEvents;
  }

  return hasStats || hasEvents;
}

export function assertOverviewHasDbData(input: {
  renderMode: MatchOverviewRenderMode;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
  fixtureLabel: string;
}): void {
  if (input.renderMode === "pre") {
    return;
  }

  if (!overviewHasRenderableMatchData(input)) {
    throw new Error(
      `${input.fixtureLabel}: expected events or statistics for ${input.renderMode} overview, got events=${input.events.length} stats=${input.statistics.length}`
    );
  }
}
