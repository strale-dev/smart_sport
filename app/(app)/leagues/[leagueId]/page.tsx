import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Suspense } from "react";

import { LeagueDetailsTabsSection } from "@/components/league/LeagueDetailsTabsSection";
import { LeagueHeader } from "@/components/league/LeagueHeader";
import { LeagueViewAnalytics } from "@/components/league/LeagueViewAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { parseProviderId } from "@/lib/fixtures/ids";
import { resolveLeagueSeasonYear } from "@/lib/leagues/season";
import { parseLeagueSeason, parseLeagueTab } from "@/lib/leagues/url";
import {
  getFixturesForLeagueSeason,
  getLeagueDetail,
  getLeagueTopScorers,
  getLeagueTopStats,
  getStandings,
} from "@/lib/services/footballService";
import { getCurrentUser } from "@/lib/supabase/user";
import type {
  Fixture,
  LeaguePlayerLeaderboardRow,
  LeagueStatLeaderboard,
  StandingsGroup,
} from "@/types/domain";

type LeaguePageProps = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ tab?: string; season?: string }>;
};

export async function generateMetadata({
  params,
}: LeaguePageProps): Promise<Metadata> {
  const { leagueId } = await params;
  const id = parseProviderId(leagueId);

  if (id == null) {
    return { title: "League" };
  }

  const { data: detail } = await getLeagueDetail(id);

  if (!detail) {
    return { title: "League" };
  }

  return { title: detail.league.name };
}

export default async function LeaguePage({
  params,
  searchParams,
}: LeaguePageProps) {
  const [{ leagueId }, query] = await Promise.all([params, searchParams]);
  const id = parseProviderId(leagueId);

  if (id == null) {
    notFound();
  }

  const activeTab = parseLeagueTab(query.tab);
  const requestedSeason = parseLeagueSeason(query.season);

  const [{ data: detail }, user] = await Promise.all([
    getLeagueDetail(id),
    getCurrentUser(),
  ]);

  if (!detail) {
    notFound();
  }

  const { league, seasons } = detail;
  const seasonYear = resolveLeagueSeasonYear(seasons, requestedSeason);

  const emptyStandings: StandingsGroup[] = [];
  const emptyFixtures: Fixture[] = [];
  const emptyLeaderboard: LeaguePlayerLeaderboardRow[] = [];
  const emptyTopStats: LeagueStatLeaderboard[] = [];

  const [standingsResult, fixturesResult, topScorersResult, topStatsResult] =
    await Promise.all([
      seasonYear != null
        ? getStandings(id, seasonYear).catch((error: unknown) => {
            console.warn("[league] standings unavailable", error);
            return {
              data: emptyStandings,
              meta: { cached: false, stale: false },
            };
          })
        : Promise.resolve({
            data: emptyStandings,
            meta: { cached: false, stale: false },
          }),
      seasonYear != null
        ? getFixturesForLeagueSeason(id, seasonYear).catch((error: unknown) => {
            console.warn("[league] fixtures unavailable", error);
            return {
              data: emptyFixtures,
              meta: { cached: false, stale: false },
            };
          })
        : Promise.resolve({
            data: emptyFixtures,
            meta: { cached: false, stale: false },
          }),
      seasonYear != null
        ? getLeagueTopScorers(id, seasonYear).catch((error: unknown) => {
            console.warn("[league] top scorers unavailable", error);
            return {
              data: emptyLeaderboard,
              meta: { cached: false, stale: false },
            };
          })
        : Promise.resolve({
            data: emptyLeaderboard,
            meta: { cached: false, stale: false },
          }),
      seasonYear != null
        ? getLeagueTopStats(id, seasonYear).catch((error: unknown) => {
            console.warn("[league] top stats unavailable", error);
            return {
              data: emptyTopStats,
              meta: { cached: false, stale: false },
            };
          })
        : Promise.resolve({
            data: emptyTopStats,
            meta: { cached: false, stale: false },
          }),
    ]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
        <LeagueHeader
          league={league}
          seasons={seasons}
          seasonYear={seasonYear}
        />
      </Suspense>
      <LeagueDetailsTabsSection
        league={league}
        seasons={seasons}
        seasonYear={seasonYear}
        standings={standingsResult.data}
        fixtures={fixturesResult.data}
        topScorers={topScorersResult.data}
        topStats={topStatsResult.data}
      />
      <LeagueViewAnalytics
        leagueExternalId={league.externalId}
        seasonYear={seasonYear}
        tab={activeTab}
        isGuest={!user}
      />
    </div>
  );
}
