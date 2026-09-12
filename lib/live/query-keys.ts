import type { LiveCenterParams } from "@/lib/live/live-center-types";

export const liveKeys = {
  all: ["live"] as const,
  fixture: (providerId: number) =>
    [...liveKeys.all, "fixture", providerId] as const,
  fixtureSnapshot: (providerId: number) =>
    [...liveKeys.all, "fixture-snapshot", providerId] as const,
  center: (params: LiveCenterParams) =>
    [...liveKeys.all, "center", params] as const,
  dashboardLive: () => [...liveKeys.all, "dashboard-live"] as const,
  liveInsight: (providerId: number) =>
    [...liveKeys.all, "live-insight", providerId] as const,
  probabilityDelta: (providerId: number) =>
    [...liveKeys.all, "probability-delta", providerId] as const,
};
