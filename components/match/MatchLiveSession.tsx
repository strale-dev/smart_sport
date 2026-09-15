"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { MatchLiveWatchLimitBanner } from "@/components/match/MatchLiveWatchLimitBanner";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import type { LiveWatchResult } from "@/lib/live/watch-client";
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
  const [watchError, setWatchError] = useState<
    (LiveWatchResult & { ok: false }) | null
  >(null);

  const onWatchError = useCallback((error: LiveWatchResult & { ok: false }) => {
    setWatchError(error);
  }, []);

  const live = useLiveMatch(fixture.externalId, fixture.status, {
    initialSnapshot,
    onWatchError,
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
      {watchError ? (
        <div className="mb-4">
          <MatchLiveWatchLimitBanner
            code={watchError.code}
            limit={watchError.limit}
            used={watchError.used}
          />
        </div>
      ) : null}
      {children}
    </MatchLiveContext.Provider>
  );
}

export function useMatchLiveContext(): MatchLiveContextValue | null {
  return useContext(MatchLiveContext);
}
