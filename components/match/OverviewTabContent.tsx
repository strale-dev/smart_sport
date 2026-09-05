import { LiveStatsCard } from "@/components/match/LiveStatsCard";
import {
  MatchMomentumCardLazy,
  TeamComparisonCardLazy,
} from "@/components/match/overview-chart-cards";
import { PlayersToWatchCard } from "@/components/match/PlayersToWatchCard";
import { TimelineCard } from "@/components/match/TimelineCard";
import {
  getOverviewCardOrder,
  getOverviewLayout,
  isOverviewCardVisible,
} from "@/lib/fixtures/overview-layout";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
  FormSnapshot,
} from "@/types/domain";

type OverviewTabContentProps = {
  fixture: Fixture;
  stats: FixtureTeamStatistics[];
  events: FixtureEvent[];
  momentumBuckets: MomentumBucket[];
  homeForm: FormSnapshot;
  awayForm: FormSnapshot;
};

export function OverviewTabContent({
  fixture,
  stats,
  events,
  momentumBuckets,
  homeForm,
  awayForm,
}: OverviewTabContentProps) {
  const mode = getOverviewLayout(fixture.status);
  const order = getOverviewCardOrder(mode);

  const cards = {
    timeline: isOverviewCardVisible("timeline", mode) ? (
      <TimelineCard key="timeline" events={events} />
    ) : null,
    momentum: isOverviewCardVisible("momentum", mode) ? (
      <MatchMomentumCardLazy
        key="momentum"
        fixtureId={fixture.externalId}
        status={fixture.status}
        homeTeamName={fixture.homeTeam.name}
        awayTeamName={fixture.awayTeam.name}
        buckets={momentumBuckets}
      />
    ) : null,
    liveStats: isOverviewCardVisible("liveStats", mode) ? (
      <LiveStatsCard key="liveStats" fixture={fixture} stats={stats} />
    ) : null,
    comparison: isOverviewCardVisible("comparison", mode) ? (
      <TeamComparisonCardLazy
        key="comparison"
        fixture={fixture}
        stats={stats}
        homeForm={homeForm}
        awayForm={awayForm}
      />
    ) : null,
    playersToWatch: isOverviewCardVisible("playersToWatch", mode) ? (
      <PlayersToWatchCard key="playersToWatch" fixture={fixture} />
    ) : null,
  };

  return (
    <div className="space-y-4">{order.map((cardId) => cards[cardId])}</div>
  );
}
