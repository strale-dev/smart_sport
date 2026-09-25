import { MatchBlockUnavailableCard } from "@/components/match/MatchBlockUnavailableCard";
import { MatchStatisticsCard } from "@/components/match/MatchStatisticsCard";
import { MatchStatisticsLiveClient } from "@/components/match/MatchStatisticsLiveClient";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import { aggregatePlayerDerivedStats } from "@/lib/match/build-match-statistics-view-model";
import { TeamComparisonCardLazy } from "@/components/match/overview-chart-cards";
import { computeRecentForm } from "@/lib/services/analyticsService";
import {
  getFixturePlayers,
  getFixtureStatistics,
} from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

type MatchStatisticsPanelProps = {
  fixture: Fixture;
  premiumAnalytics: boolean;
};

export async function MatchStatisticsPanel({
  fixture,
  premiumAnalytics,
}: MatchStatisticsPanelProps) {
  const renderMode = getMatchOverviewRenderMode(fixture.status);

  if (renderMode === "pre") {
    return <MatchStatisticsCard fixture={fixture} renderMode="pre" />;
  }

  let stats: Awaited<ReturnType<typeof getFixtureStatistics>>["data"] = [];
  let performances: Awaited<ReturnType<typeof getFixturePlayers>>["data"] = [];
  let unavailable = false;

  try {
    const [statsResult, playersResult] = await Promise.all([
      getFixtureStatistics(fixture.externalId),
      getFixturePlayers(fixture.externalId),
    ]);
    stats = statsResult.data ?? [];
    performances = playersResult.data ?? [];
  } catch (error) {
    console.warn("[match] statistics unavailable", error);
    unavailable = true;
  }

  if (unavailable) {
    return (
      <MatchBlockUnavailableCard
        title="Statistics"
        retryHref={buildMatchHref(fixture.externalId, "statistics")}
      />
    );
  }

  const playerDerived = aggregatePlayerDerivedStats(
    performances,
    fixture.homeTeam.externalId,
    fixture.awayTeam.externalId
  );

  if (renderMode === "live") {
    return (
      <MatchStatisticsLiveClient
        fixture={fixture}
        initialStatistics={stats}
        playerDerived={playerDerived}
      />
    );
  }

  const [homeForm, awayForm] = await Promise.all([
    computeRecentForm(fixture.homeTeam.externalId, {
      matches: 5,
      scope: "ALL",
    }),
    computeRecentForm(fixture.awayTeam.externalId, {
      matches: 5,
      scope: "ALL",
    }),
  ]);

  return (
    <div className="space-y-3">
      <MatchStatisticsCard
        fixture={fixture}
        stats={stats}
        playerDerived={playerDerived}
        renderMode={renderMode}
      />
      <TeamComparisonCardLazy
        fixture={fixture}
        stats={stats}
        homeForm={homeForm}
        awayForm={awayForm}
        premiumAnalytics={premiumAnalytics}
      />
    </div>
  );
}
