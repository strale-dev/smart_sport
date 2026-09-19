"use client";

import { MatchStatisticsCard } from "@/components/match/MatchStatisticsCard";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { mergeLiveSnapshotSlice } from "@/lib/live/merge-snapshot";
import type { MatchStatisticsTeamDerived } from "@/lib/match/build-match-statistics-view-model";
import type { Fixture, FixtureTeamStatistics } from "@/types/domain";

type MatchStatisticsLiveClientProps = {
  fixture: Fixture;
  initialStatistics: FixtureTeamStatistics[];
  playerDerived: MatchStatisticsTeamDerived;
};

export function MatchStatisticsLiveClient({
  fixture: serverFixture,
  initialStatistics,
  playerDerived,
}: MatchStatisticsLiveClientProps) {
  const live = useMatchLiveContext();

  const merged = mergeLiveSnapshotSlice(live, {
    fixture: serverFixture,
    events: [],
    statistics: initialStatistics,
  });

  const fixture = merged.fixture ?? serverFixture;
  const stats = merged.statistics;

  return (
    <MatchStatisticsCard
      fixture={fixture}
      stats={stats}
      playerDerived={playerDerived}
      renderMode="live"
    />
  );
}
