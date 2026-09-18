"use client";

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
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  Lineup,
} from "@/types/domain";

type MatchOverviewLiveClientProps = {
  fixture: Fixture;
  returnTo: string;
  initialEvents: FixtureEvent[];
  initialStatistics: FixtureTeamStatistics[];
  homeForm3: FormSnapshot;
  awayForm3: FormSnapshot;
  playersToWatch: PlayersToWatchResult;
  lineups: Lineup[];
  lineupPerformances: FixturePlayerPerformance[];
  lineupSidelined: FixtureSidelinedPlayer[];
};

export function MatchOverviewLiveClient({
  fixture: serverFixture,
  returnTo,
  initialEvents,
  initialStatistics,
  homeForm3,
  awayForm3,
  playersToWatch,
  lineups,
  lineupPerformances,
  lineupSidelined,
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
      renderMode="live"
      returnTo={returnTo}
      events={events}
      momentumBuckets={momentumBuckets}
      homeForm3={homeForm3}
      awayForm3={awayForm3}
      playersToWatch={playersToWatch}
      lineups={lineups}
      lineupPerformances={lineupPerformances}
      lineupSidelined={lineupSidelined}
    />
  );
}
