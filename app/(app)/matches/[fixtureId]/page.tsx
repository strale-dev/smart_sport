import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormCard } from "@/components/match/FormCard";
import { H2HCard } from "@/components/match/H2HCard";
import { LineupsCard } from "@/components/match/LineupsCard";
import { MatchDetailsTabsSection } from "@/components/match/MatchDetailsTabsSection";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStandingsTable } from "@/components/match/MatchStandingsTable";
import { MatchViewAnalytics } from "@/components/match/MatchViewAnalytics";
import { MatchTeamsFixturesList } from "@/components/match/MatchTeamsFixturesList";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { getOverviewLayout } from "@/lib/fixtures/overview-layout";
import { parseFixtureId } from "@/lib/fixtures/ids";
import { mergeTeamFixtures } from "@/lib/match/merge-team-fixtures";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import { getH2H, getRecentForm } from "@/lib/services/analyticsService";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureLineups,
  getFixturesForTeam,
  getFixtureStatistics,
  getStandings,
} from "@/lib/services/footballService";
import { getCurrentUser } from "@/lib/supabase/user";
import type { StandingsGroup } from "@/types/domain";

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

  const { data: fixture } = await getFixtureById(id);

  if (!fixture) {
    redirect("/fixtures?notice=match_not_found");
  }

  const [
    { data: stats },
    { data: events },
    { data: lineups },
    { data: standings },
    homeForm5,
    homeForm10,
    awayForm5,
    awayForm10,
    h2hAll,
    h2hSameComp,
    { data: homeTeamFixtures },
    { data: awayTeamFixtures },
    user,
  ] = await Promise.all([
    getFixtureStatistics(id),
    getFixtureEvents(id),
    getFixtureLineups(id),
    fixture.seasonYear
      ? getStandings(fixture.league.externalId, fixture.seasonYear)
      : Promise.resolve({
          data: [] as StandingsGroup[],
          meta: { cached: false, stale: false },
        }),
    getRecentForm(fixture.homeTeam.externalId, { matches: 5, scope: "ALL" }),
    getRecentForm(fixture.homeTeam.externalId, { matches: 10, scope: "ALL" }),
    getRecentForm(fixture.awayTeam.externalId, { matches: 5, scope: "ALL" }),
    getRecentForm(fixture.awayTeam.externalId, { matches: 10, scope: "ALL" }),
    getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "ALL",
    }),
    getH2H(fixture.homeTeam.externalId, fixture.awayTeam.externalId, {
      windowSize: 10,
      scope: "SAME_COMP",
      leagueProviderId: fixture.league.externalId,
    }),
    getFixturesForTeam(fixture.homeTeam.externalId),
    getFixturesForTeam(fixture.awayTeam.externalId),
    getCurrentUser(),
  ]);

  const relatedFixtures = mergeTeamFixtures(
    homeTeamFixtures,
    awayTeamFixtures,
    {
      excludeFixtureId: fixture.externalId,
    }
  );

  const overviewMode = getOverviewLayout(fixture.status);
  const momentumBuckets =
    overviewMode === "live"
      ? computeMatchMomentum(events, stats, fixture.minute ?? 90)
      : [];

  const returnTo = `/matches/${id}`;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <MatchHeader fixture={fixture} />

      <MatchDetailsTabsSection
        isGuest={!user}
        returnTo={returnTo}
        fixtureId={fixture.externalId}
        overview={
          <OverviewTabContent
            fixture={fixture}
            stats={stats}
            events={events}
            momentumBuckets={momentumBuckets}
            homeForm={homeForm10}
            awayForm={awayForm10}
          />
        }
        lineups={<LineupsCard fixture={fixture} lineups={lineups} />}
        standings={
          <MatchStandingsTable
            leagueName={fixture.league.name}
            standings={standings}
            homeTeamExternalId={fixture.homeTeam.externalId}
            awayTeamExternalId={fixture.awayTeam.externalId}
          />
        }
        matches={
          <>
            <FormCard
              homeTeamName={fixture.homeTeam.name}
              awayTeamName={fixture.awayTeam.name}
              homeForm5={homeForm5}
              homeForm10={homeForm10}
              awayForm5={awayForm5}
              awayForm10={awayForm10}
            />
            <H2HCard
              homeTeamName={fixture.homeTeam.name}
              awayTeamName={fixture.awayTeam.name}
              h2hAll={h2hAll}
              h2hSameComp={h2hSameComp}
            />
            <MatchTeamsFixturesList fixtures={relatedFixtures} />
          </>
        }
      />

      <MatchViewAnalytics fixture={fixture} isGuest={!user} />
    </div>
  );
}
