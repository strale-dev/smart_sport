import { buildLiveCenterApiHref } from "@/lib/live/url";
import type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/live/live-center-types";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

export type MatchLiveSnapshot = {
  fixture: Fixture;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
};

export type DashboardLiveResponse = {
  live: LiveFixtureRow[];
};

export async function fetchMatchSnapshot(
  fixtureProviderId: number
): Promise<MatchLiveSnapshot> {
  const response = await fetch(`/api/matches/${fixtureProviderId}/snapshot`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`match_snapshot_${response.status}`);
  }

  return (await response.json()) as MatchLiveSnapshot;
}

export async function fetchLiveCenterData(
  params: LiveCenterParams
): Promise<LiveCenterData> {
  const href = buildLiveCenterApiHref(params);
  const response = await fetch(href, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`live_center_${response.status}`);
  }

  return (await response.json()) as LiveCenterData;
}

export async function fetchDashboardLive(): Promise<DashboardLiveResponse> {
  const response = await fetch("/api/dashboard/live", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`dashboard_live_${response.status}`);
  }

  return (await response.json()) as DashboardLiveResponse;
}
