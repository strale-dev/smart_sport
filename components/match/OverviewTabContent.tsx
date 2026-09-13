import { Fragment, type ReactNode } from "react";

import { FormPreviewCard } from "@/components/match/FormPreviewCard";
import { H2HPreviewCard } from "@/components/match/H2HPreviewCard";
import { LineupTeaserCard } from "@/components/match/LineupTeaserCard";
import { LiveStatsCard } from "@/components/match/LiveStatsCard";
import {
  MatchMomentumCardLazy,
  TeamComparisonCardLazy,
} from "@/components/match/overview-chart-cards";
import { PlayersToWatchCard } from "@/components/match/PlayersToWatchCard";
import { TimelineCard } from "@/components/match/TimelineCard";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import { aggregateForm } from "@/lib/analytics/compute-form";
import {
  getOverviewCardOrder,
  getOverviewLayout,
  isOverviewCardVisible,
} from "@/lib/fixtures/overview-layout";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
  FormSnapshot,
  H2HSummary,
  Lineup,
} from "@/types/domain";

const EMPTY_FORM_5: FormSnapshot = aggregateForm([], "ALL", 5);

function emptyH2hSummary(fixture: Fixture): H2HSummary {
  return summarizeH2HMeetings(
    [],
    fixture.homeTeam.externalId,
    fixture.awayTeam.externalId,
    10,
    "ALL"
  );
}

type OverviewTabContentProps = {
  fixture: Fixture;
  stats: FixtureTeamStatistics[];
  events: FixtureEvent[];
  momentumBuckets: MomentumBucket[];
  homeForm: FormSnapshot;
  awayForm: FormSnapshot;
  homeForm5?: FormSnapshot;
  awayForm5?: FormSnapshot;
  h2hAll?: H2HSummary;
  playersToWatch: PlayersToWatchResult;
  lineups: Lineup[];
  probabilityDelta?: ReactNode;
};

export function OverviewTabContent({
  fixture,
  stats,
  events,
  momentumBuckets,
  homeForm,
  awayForm,
  homeForm5 = EMPTY_FORM_5,
  awayForm5 = EMPTY_FORM_5,
  h2hAll,
  playersToWatch,
  lineups,
  probabilityDelta,
}: OverviewTabContentProps) {
  const h2hPreview = h2hAll ?? emptyH2hSummary(fixture);
  const mode = getOverviewLayout(fixture.status);
  const order = getOverviewCardOrder(mode);

  const cards = {
    probabilityDelta: isOverviewCardVisible("probabilityDelta", mode)
      ? probabilityDelta
      : null,
    timeline: isOverviewCardVisible("timeline", mode) ? (
      <TimelineCard key="timeline" fixture={fixture} events={events} />
    ) : null,
    momentum: isOverviewCardVisible("momentum", mode) ? (
      <MatchMomentumCardLazy
        key="momentum"
        fixture={fixture}
        buckets={momentumBuckets}
      />
    ) : null,
    liveStats: isOverviewCardVisible("liveStats", mode) ? (
      <LiveStatsCard key="liveStats" fixture={fixture} stats={stats} />
    ) : null,
    formPreview: isOverviewCardVisible("formPreview", mode) ? (
      <FormPreviewCard
        key="formPreview"
        fixture={fixture}
        homeForm5={homeForm5}
        awayForm5={awayForm5}
      />
    ) : null,
    h2hPreview: isOverviewCardVisible("h2hPreview", mode) ? (
      <H2HPreviewCard key="h2hPreview" fixture={fixture} h2hAll={h2hPreview} />
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
      <PlayersToWatchCard
        key="playersToWatch"
        fixture={fixture}
        data={playersToWatch}
      />
    ) : null,
    lineupTeaser: isOverviewCardVisible("lineupTeaser", mode) ? (
      <LineupTeaserCard
        key="lineupTeaser"
        fixture={fixture}
        lineups={lineups}
      />
    ) : null,
  };

  return (
    <div className="space-y-3">
      {order.map((cardId) => (
        <Fragment key={cardId}>{cards[cardId]}</Fragment>
      ))}
    </div>
  );
}
