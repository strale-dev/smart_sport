import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AIHeroSection } from "@/components/ai/AIHeroSection";
import { AIInsightProvider } from "@/components/ai/AIInsightProvider";
import { MatchDetailsTabsSection } from "@/components/match/MatchDetailsTabsSection";
import { MatchLiveSession } from "@/components/match/MatchLiveSession";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchViewAnalytics } from "@/components/match/MatchViewAnalytics";
import { MatchLineupsPanel } from "@/components/match/panels/MatchLineupsPanel";
import { MatchMatchesPanel } from "@/components/match/panels/MatchMatchesPanel";
import { MatchOverviewPanel } from "@/components/match/panels/MatchOverviewPanel";
import { MatchStandingsPanel } from "@/components/match/panels/MatchStandingsPanel";
import { MatchTabPanelFallback } from "@/components/match/panels/MatchTabPanelFallback";
import { parseFixtureId } from "@/lib/fixtures/ids";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { getCurrentUser } from "@/lib/supabase/user";

type MatchPageProps = {
  params: Promise<{ fixtureId: string }>;
};

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { fixtureId } = await params;
  const id = parseFixtureId(fixtureId);

  if (id == null) {
    return { title: "Match" };
  }

  const { data: fixture } = await getFixtureById(id);

  if (!fixture) {
    return { title: "Match" };
  }

  return {
    title: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
  };
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { fixtureId } = await params;
  const id = parseFixtureId(fixtureId);

  if (id == null) {
    redirect("/fixtures?notice=match_not_found");
  }

  const [{ data: fixture }, user] = await Promise.all([
    getFixtureById(id),
    getCurrentUser(),
  ]);

  if (!fixture) {
    redirect("/fixtures?notice=match_not_found");
  }

  const returnTo = `/matches/${id}`;
  const isGuest = !user;

  let initialLiveSnapshot: MatchLiveSnapshot | undefined;
  if (isLiveFixtureStatus(fixture.status)) {
    const [{ data: events }, { data: statistics }] = await Promise.all([
      getFixtureEvents(fixture.externalId),
      getFixtureStatistics(fixture.externalId),
    ]);
    initialLiveSnapshot = {
      fixture,
      events,
      statistics,
    };
  }

  return (
    <AIInsightProvider
      key={`${fixture.externalId}-${fixture.status}-${isGuest ? "guest" : "user"}`}
      fixtureId={fixture.externalId}
      fixtureStatus={fixture.status}
      isGuest={isGuest}
    >
      <MatchLiveSession fixture={fixture} initialSnapshot={initialLiveSnapshot}>
        <div className="flex w-full max-w-3xl flex-col gap-6">
          <MatchHeader fixture={fixture} />

          <AIHeroSection
            homeTeam={fixture.homeTeam}
            awayTeam={fixture.awayTeam}
            returnTo={returnTo}
          />

          <MatchDetailsTabsSection
            fixtureId={fixture.externalId}
            homeTeam={fixture.homeTeam}
            awayTeam={fixture.awayTeam}
            overview={
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchOverviewPanel fixture={fixture} />
              </Suspense>
            }
            lineups={
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchLineupsPanel fixture={fixture} />
              </Suspense>
            }
            standings={
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchStandingsPanel fixture={fixture} />
              </Suspense>
            }
            matches={
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchMatchesPanel fixture={fixture} />
              </Suspense>
            }
          />

          <MatchViewAnalytics fixture={fixture} isGuest={isGuest} />
        </div>
      </MatchLiveSession>
    </AIInsightProvider>
  );
}
