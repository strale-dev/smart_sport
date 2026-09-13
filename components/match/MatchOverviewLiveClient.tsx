"use client";

import { LiveProbabilityDeltaClient } from "@/components/match/LiveProbabilityDeltaClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { mergeLiveSnapshotSlice } from "@/lib/live/merge-snapshot";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
  FormSnapshot,
  Lineup,
} from "@/types/domain";

type MatchOverviewLiveClientProps = {
  fixture: Fixture;
  initialEvents: FixtureEvent[];
  initialStatistics: FixtureTeamStatistics[];
  homeForm: FormSnapshot;
  awayForm: FormSnapshot;
  playersToWatch: PlayersToWatchResult;
  lineups: Lineup[];
};

export function MatchOverviewLiveClient({
  fixture: serverFixture,
  initialEvents,
  initialStatistics,
  homeForm,
  awayForm,
  playersToWatch,
  lineups,
}: MatchOverviewLiveClientProps) {
  const live = useMatchLiveContext();

  const merged = mergeLiveSnapshotSlice(live, {
    fixture: serverFixture,
    events: initialEvents,
    statistics: initialStatistics,
  });
  const fixture = merged.fixture ?? serverFixture;
  const events = merged.events;
  const stats = merged.statistics;
  const momentumBuckets = computeMatchMomentum(
    events,
    stats,
    fixture.minute ?? 90
  );

  return (
    <OverviewTabContent
      fixture={fixture}
      stats={stats}
      events={events}
      momentumBuckets={momentumBuckets}
      homeForm={homeForm}
      awayForm={awayForm}
      playersToWatch={playersToWatch}
      lineups={lineups}
      probabilityDelta={
        <LiveProbabilityDeltaClient
          key="probabilityDelta"
          fixtureProviderId={fixture.externalId}
          fixtureStatus={fixture.status}
          emptyFixture={fixture}
        />
      }
    />
  );
}
