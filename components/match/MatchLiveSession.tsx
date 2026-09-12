"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useLiveMatch } from "@/hooks/useLiveMatch";
import type { MatchLiveSnapshot } from "@/lib/live/live-fetch";
import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

type MatchLiveContextValue = {
  fixture: Fixture;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
  isLive: boolean;
  isFetching: boolean;
  lastMeaningfulEvent: MeaningfulEventBroadcastPayload | null;
};

const MatchLiveContext = createContext<MatchLiveContextValue | null>(null);

type MatchLiveSessionProps = {
  fixture: Fixture;
  initialSnapshot?: MatchLiveSnapshot;
  children: ReactNode;
};

export function MatchLiveSession({
  fixture,
  initialSnapshot,
  children,
}: MatchLiveSessionProps) {
  const live = useLiveMatch(fixture.externalId, fixture.status, {
    initialSnapshot,
  });

  const value = useMemo<MatchLiveContextValue>(
    () => ({
      fixture: live.fixture ?? fixture,
      events: live.events,
      statistics: live.statistics,
      isLive: live.isLive,
      isFetching: live.isFetching,
      lastMeaningfulEvent: live.lastMeaningfulEvent,
    }),
    [
      fixture,
      live.events,
      live.fixture,
      live.isFetching,
      live.isLive,
      live.lastMeaningfulEvent,
      live.statistics,
    ]
  );

  return (
    <MatchLiveContext.Provider value={value}>
      {children}
    </MatchLiveContext.Provider>
  );
}

export function useMatchLiveContext(): MatchLiveContextValue | null {
  return useContext(MatchLiveContext);
}
