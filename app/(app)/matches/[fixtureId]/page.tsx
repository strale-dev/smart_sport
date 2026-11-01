import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AIInsightProvider } from "@/components/ai/AIInsightProvider";
import { MatchAIHeroSection } from "@/components/match/MatchAIHeroSection";
import { MatchDetailsTabsSection } from "@/components/match/MatchDetailsTabsSection";
import { MatchLiveSession } from "@/components/match/MatchLiveSession";
import { FavoriteMatchToggle } from "@/components/follow/FavoriteMatchToggle";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchViewAnalytics } from "@/components/match/MatchViewAnalytics";
import { MatchLineupsPanel } from "@/components/match/panels/MatchLineupsPanel";
import { MatchStatisticsPanel } from "@/components/match/panels/MatchStatisticsPanel";
import { MatchMatchesPanel } from "@/components/match/panels/MatchMatchesPanel";
import { MatchOverviewPanel } from "@/components/match/panels/MatchOverviewPanel";
import { MatchStandingsPanel } from "@/components/match/panels/MatchStandingsPanel";
import { MatchTabPanelFallback } from "@/components/match/panels/MatchTabPanelFallback";
import { parseFixtureId } from "@/lib/fixtures/ids";
import { parseMatchTab, type MatchTab } from "@/lib/fixtures/match-url";
import { resolveMatchFixtureContext } from "@/lib/match/fixture-context";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import { loadMatchFixture } from "@/lib/match/load-match-fixture";
import {
  getFixtureEvents,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import { isFixtureFavorited } from "@/lib/services/followService";
import { canAccessPremiumAnalytics } from "@/lib/entitlements/analytics-gate";
import { getCurrentUser } from "@/lib/supabase/user";

type MatchPageProps = {
  params: Promise<{ fixtureId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function resolveActiveMatchTab(
  tabParam: string | undefined,
  supportsStandings: boolean
): MatchTab {
  const tab = parseMatchTab(tabParam);
  if (!supportsStandings && tab === "standings") {
    return "overview";
  }
  return tab;
}

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { fixtureId } = await params;
  const id = parseFixtureId(fixtureId);

  if (id == null) {
    return { title: "Match" };
  }

  const { data: fixture } = await loadMatchFixture(id);

  if (!fixture) {
    return { title: "Match" };
  }

  return {
    title: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
  };
}

export default async function MatchPage({
  params,
  searchParams,
}: MatchPageProps) {
  const [{ fixtureId }, { tab: tabParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const id = parseFixtureId(fixtureId);

  if (id == null) {
    redirect("/fixtures?notice=match_not_found");
  }

  const [{ data: fixture }, user] = await Promise.all([
    loadMatchFixture(id),
    getCurrentUser(),
  ]);

  if (!fixture) {
    redirect("/fixtures?notice=match_not_found");
  }

  const returnTo = `/matches/${id}`;
  const matchContext = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });
  const isGuest = !user;
  const activeTab = resolveActiveMatchTab(
    tabParam,
    matchContext.supportsStandings
  );
  const inactivePanel = <MatchTabPanelFallback />;

  const [premiumAnalytics, initialFavorited, initialLiveSnapshot] =
    await Promise.all([
      canAccessPremiumAnalytics(user?.id ?? null),
      user
        ? isFixtureFavorited(user.id, id).catch(() => false)
        : Promise.resolve(false),
      isLiveFixtureStatus(fixture.status)
        ? Promise.all([
            getFixtureEvents(fixture.externalId),
            getFixtureStatistics(fixture.externalId),
          ]).then(
            ([{ data: events }, { data: statistics }]) =>
              ({
                fixture,
                events,
                statistics,
              }) satisfies MatchLiveSnapshot
          )
        : Promise.resolve(undefined),
    ]);

  return (
    <MatchLiveSession fixture={fixture} initialSnapshot={initialLiveSnapshot}>
      <MatchHeader
        fixture={fixture}
        favoriteControl={
          <>
            <SoundToggle />
            <FavoriteMatchToggle
              fixtureProviderId={id}
              initialFavorited={initialFavorited}
              isAuthenticated={!isGuest}
              returnTo={returnTo}
            />
          </>
        }
      />

      <AIInsightProvider
        key={`${fixture.externalId}-${isGuest ? "guest" : "user"}`}
        fixtureId={fixture.externalId}
        fixtureStatus={fixture.status}
        kickoffAt={fixture.kickoffAt}
        isGuest={isGuest}
      >
        <MatchAIHeroSection
          homeTeam={fixture.homeTeam}
          awayTeam={fixture.awayTeam}
          returnTo={returnTo}
        />

        <MatchDetailsTabsSection
          fixtureId={fixture.externalId}
          homeTeam={fixture.homeTeam}
          awayTeam={fixture.awayTeam}
          showStandingsTab={matchContext.supportsStandings}
          overview={
            activeTab === "overview" ? (
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchOverviewPanel
                  fixture={fixture}
                  liveSnapshot={initialLiveSnapshot}
                  returnTo={returnTo}
                  premiumAnalytics={premiumAnalytics}
                />
              </Suspense>
            ) : (
              inactivePanel
            )
          }
          lineups={
            activeTab === "lineups" ? (
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchLineupsPanel fixture={fixture} />
              </Suspense>
            ) : (
              inactivePanel
            )
          }
          statistics={
            activeTab === "statistics" ? (
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchStatisticsPanel
                  fixture={fixture}
                  premiumAnalytics={premiumAnalytics}
                />
              </Suspense>
            ) : (
              inactivePanel
            )
          }
          standings={
            activeTab === "standings" ? (
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchStandingsPanel fixture={fixture} />
              </Suspense>
            ) : (
              inactivePanel
            )
          }
          matches={
            activeTab === "matches" ? (
              <Suspense fallback={<MatchTabPanelFallback />}>
                <MatchMatchesPanel
                  fixture={fixture}
                  premiumAnalytics={premiumAnalytics}
                />
              </Suspense>
            ) : (
              inactivePanel
            )
          }
        />
      </AIInsightProvider>

      <MatchViewAnalytics fixture={fixture} isGuest={isGuest} />
    </MatchLiveSession>
  );
}
