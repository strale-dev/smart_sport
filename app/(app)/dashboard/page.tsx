import type { Metadata } from "next";

import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";
import { DashboardQuickLinks } from "@/components/dashboard/DashboardQuickLinks";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { FeaturedMatchHero } from "@/components/dashboard/FeaturedMatchHero";
import { FollowedSection } from "@/components/dashboard/FollowedSection";
import { MatchRow } from "@/components/match/MatchRow";
import { getDashboardData } from "@/lib/services/dashboardService";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <DashboardQuickLinks />

      {data.featured ? <FeaturedMatchHero fixture={data.featured} /> : null}

      <DashboardSection
        title="Live now"
        actionHref="/live"
        actionLabel="Live Center"
      >
        {data.live.length > 0 ? (
          <div className="space-y-2">
            {data.live.map((fixture) => (
              <MatchRow key={fixture.externalId} fixture={fixture} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No live matches right now.
          </p>
        )}
      </DashboardSection>

      <DashboardSection
        title={data.isTodayFallback ? "Nearby matches" : "Important today"}
        description={
          data.isTodayFallback
            ? "No matches today. Showing the most recent synced fixtures nearby."
            : undefined
        }
      >
        {data.todayImportant.length > 0 ? (
          <div className="space-y-2">
            {data.todayImportant.map((fixture) => (
              <MatchRow key={fixture.externalId} fixture={fixture} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No matches today.</p>
        )}
      </DashboardSection>

      <DashboardSection title="Upcoming high-interest">
        {data.upcoming.length > 0 ? (
          <div className="space-y-2">
            {data.upcoming.map((fixture) => (
              <MatchRow key={fixture.externalId} fixture={fixture} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No upcoming fixtures in the next week.
          </p>
        )}
      </DashboardSection>

      <DashboardSection title="AI insights">
        <AIInsightsSection insights={data.aiInsights} />
      </DashboardSection>

      <DashboardSection title="Followed teams & players">
        <FollowedSection />
      </DashboardSection>
    </div>
  );
}
