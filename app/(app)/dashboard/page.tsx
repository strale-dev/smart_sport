import type { Metadata } from "next";

import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";
import { DashboardQuickLinks } from "@/components/dashboard/DashboardQuickLinks";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { FeaturedMatchHero } from "@/components/dashboard/FeaturedMatchHero";
import { FollowedSection } from "@/components/dashboard/FollowedSection";
import { DashboardLiveSection } from "@/components/dashboard/DashboardLiveSection";
import { MatchRow } from "@/components/match/MatchRow";
import { formatDateKeyInTimezone } from "@/lib/datetime/timezone";
import { resolveViewerTimezone } from "@/lib/datetime/viewer-timezone.server";
import { getDashboardData } from "@/lib/services/dashboardService";
import { readPreferredLeagueProviderId } from "@/lib/services/userService";
import { listUserFollows } from "@/lib/services/followService";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const timeZone = await resolveViewerTimezone(user?.id ?? null);
  const todayDateKey = formatDateKeyInTimezone(new Date(), timeZone);
  const preferredLeagueProviderId = user
    ? await readPreferredLeagueProviderId(user.id)
    : null;

  const [data, followedData] = await Promise.all([
    getDashboardData({ preferredLeagueExternalId: preferredLeagueProviderId }),
    user
      ? listUserFollows(user.id).catch(() => ({
          teams: [],
          players: [],
          leagues: [],
        }))
      : Promise.resolve({ teams: [], players: [], leagues: [] }),
  ]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <DashboardQuickLinks
        preferredLeagueProviderId={preferredLeagueProviderId}
      />

      {data.featured ? <FeaturedMatchHero fixture={data.featured} /> : null}

      <DashboardLiveSection initialLive={data.live} />

      <DashboardSection
        title={
          data.isTodayFallback ? "Next synced fixtures" : "Important today"
        }
        description={
          data.isTodayFallback
            ? "No matches today. Showing the next allowlisted fixtures in your sync window."
            : undefined
        }
      >
        {data.todayImportant.length > 0 ? (
          <div className="space-y-2">
            {data.todayImportant.map((fixture) => (
              <MatchRow
                key={fixture.externalId}
                fixture={fixture}
                todayDateKey={todayDateKey}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No matches today.</p>
        )}
      </DashboardSection>

      {data.recentResults.length > 0 ? (
        <DashboardSection title="Recent results">
          <div className="space-y-2">
            {data.recentResults.map((fixture) => (
              <MatchRow key={fixture.externalId} fixture={fixture} />
            ))}
          </div>
        </DashboardSection>
      ) : null}

      <DashboardSection title="Upcoming high-interest">
        {data.upcoming.length > 0 ? (
          <div className="space-y-2">
            {data.upcoming.map((fixture) => (
              <MatchRow
                key={fixture.externalId}
                fixture={fixture}
                todayDateKey={todayDateKey}
              />
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
        <FollowedSection data={followedData} isAuthenticated={Boolean(user)} />
      </DashboardSection>
    </div>
  );
}
