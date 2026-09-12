"use client";

import { LiveProbabilityDeltaClient } from "@/components/match/LiveProbabilityDeltaClient";
import { OverviewTabContent } from "@/components/match/OverviewTabContent";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type { Fixture, FormSnapshot } from "@/types/domain";

type MatchOverviewLiveClientProps = {
  fixture: Fixture;
  homeForm: FormSnapshot;
  awayForm: FormSnapshot;
  playersToWatch: PlayersToWatchResult;
};

export function MatchOverviewLiveClient({
  fixture: serverFixture,
  homeForm,
  awayForm,
  playersToWatch,
}: MatchOverviewLiveClientProps) {
  const live = useMatchLiveContext();

  const fixture = live?.fixture ?? serverFixture;
  const events = live?.events ?? [];
  const stats = live?.statistics ?? [];
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
      probabilityDelta={
        <LiveProbabilityDeltaClient
          key="probabilityDelta"
          fixtureProviderId={fixture.externalId}
          fixtureStatus={fixture.status}
        />
      }
    />
  );
}
