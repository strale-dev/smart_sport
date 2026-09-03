import { refreshAnalyticsForUpcomingFixtures } from "@/lib/services/analyticsService";

export type RefreshAnalyticsResult = {
  ok: boolean;
  job: string;
  stats: {
    formsRefreshed: number;
    h2hRefreshed: number;
  };
};

export async function refreshAnalytics(): Promise<RefreshAnalyticsResult> {
  const stats = await refreshAnalyticsForUpcomingFixtures();

  return {
    ok: true,
    job: "refresh-analytics",
    stats,
  };
}
