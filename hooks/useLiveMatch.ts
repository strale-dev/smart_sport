"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { LIVE_REALTIME_DOWN_REFETCH_MS } from "@/lib/live/constants";
import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import {
  fetchMatchSnapshot,
  type MatchLiveSnapshot,
} from "@/lib/live/live-fetch";
import { liveKeys } from "@/lib/live/query-keys";
import {
  subscribeMatchBroadcast,
  type MatchBroadcastSubscribeStatus,
} from "@/lib/live/subscribe-broadcast";
import { startLiveWatchSession } from "@/lib/live/watch-client";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { FixtureStatus } from "@/types/domain";

type UseLiveMatchOptions = {
  initialSnapshot?: MatchLiveSnapshot;
  onWatchError?: (
    error: import("@/lib/live/watch-client").LiveWatchResult & { ok: false }
  ) => void;
};

function isRealtimeHealthyStatus(
  status: MatchBroadcastSubscribeStatus
): boolean {
  return status === "SUBSCRIBED";
}

export function useLiveMatch(
  fixtureProviderId: number,
  fixtureStatus: string,
  options: UseLiveMatchOptions = {}
) {
  const queryClient = useQueryClient();
  const documentVisible = useDocumentVisible();
  const [lastMeaningfulEvent, setLastMeaningfulEvent] =
    useState<MeaningfulEventBroadcastPayload | null>(null);
  const [realtimeHealthy, setRealtimeHealthy] = useState(true);
  const [realtimeStatusKnown, setRealtimeStatusKnown] = useState(false);
  const resyncOnSubscribeRef = useRef(false);

  const seedStatus = fixtureStatus as FixtureStatus;
  const seedIsLive = isLiveFixtureStatus(seedStatus);

  const applySnapshot = useCallback(
    (snapshot: MatchLiveSnapshot) => {
      queryClient.setQueryData(
        liveKeys.fixtureSnapshot(fixtureProviderId),
        snapshot
      );
    },
    [fixtureProviderId, queryClient]
  );

  const snapshotQuery = useQuery({
    queryKey: liveKeys.fixtureSnapshot(fixtureProviderId),
    queryFn: () => fetchMatchSnapshot(fixtureProviderId),
    initialData: options.initialSnapshot,
    enabled: seedIsLive,
    refetchInterval: (query) => {
      const status =
        query.state.data?.fixture?.status ??
        options.initialSnapshot?.fixture?.status ??
        seedStatus;
      if (!isLiveFixtureStatus(status as FixtureStatus) || !documentVisible) {
        return false;
      }
      if (!realtimeStatusKnown || realtimeHealthy) {
        return false;
      }
      return LIVE_REALTIME_DOWN_REFETCH_MS;
    },
    refetchIntervalInBackground: false,
  });

  const fixture =
    snapshotQuery.data?.fixture ?? options.initialSnapshot?.fixture ?? null;
  const authoritativeStatus = (fixture?.status ?? seedStatus) as FixtureStatus;
  const isLive = isLiveFixtureStatus(authoritativeStatus);

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const stopWatch = startLiveWatchSession(
      {
        surface: "match",
        fixtureProviderId,
      },
      { onWatchError: options.onWatchError }
    );

    const stopBroadcast = subscribeMatchBroadcast(
      fixtureProviderId,
      (payload) => {
        const events = payload.meaningfulEvents;
        if (events && events.length > 0) {
          setLastMeaningfulEvent(events[events.length - 1] ?? null);
        }

        if (payload.snapshot) {
          applySnapshot(payload.snapshot);
        } else {
          void queryClient.invalidateQueries({
            queryKey: liveKeys.fixtureSnapshot(fixtureProviderId),
          });
        }

        if ((events && events.length > 0) || payload.liveInsightGenerated) {
          void queryClient.invalidateQueries({
            queryKey: liveKeys.liveInsight(fixtureProviderId),
          });
          void queryClient.invalidateQueries({
            queryKey: liveKeys.probabilityDelta(fixtureProviderId),
          });
        }
      },
      {
        onStatusChange: (status) => {
          setRealtimeStatusKnown(true);
          const healthy = isRealtimeHealthyStatus(status);
          setRealtimeHealthy(healthy);

          if (healthy && resyncOnSubscribeRef.current) {
            resyncOnSubscribeRef.current = false;
            void queryClient.fetchQuery({
              queryKey: liveKeys.fixtureSnapshot(fixtureProviderId),
              queryFn: () => fetchMatchSnapshot(fixtureProviderId),
            });
          }

          if (!healthy) {
            resyncOnSubscribeRef.current = true;
          }
        },
      }
    );

    return () => {
      stopBroadcast();
      stopWatch();
      setRealtimeHealthy(true);
      setRealtimeStatusKnown(false);
      resyncOnSubscribeRef.current = false;
    };
  }, [
    applySnapshot,
    fixtureProviderId,
    isLive,
    options.onWatchError,
    queryClient,
  ]);

  return useMemo(
    () => ({
      fixture,
      events:
        snapshotQuery.data?.events ?? options.initialSnapshot?.events ?? [],
      statistics:
        snapshotQuery.data?.statistics ??
        options.initialSnapshot?.statistics ??
        [],
      isFetching: snapshotQuery.isFetching,
      isLive,
      lastMeaningfulEvent,
    }),
    [
      fixture,
      isLive,
      lastMeaningfulEvent,
      options.initialSnapshot?.events,
      options.initialSnapshot?.statistics,
      snapshotQuery.data?.events,
      snapshotQuery.data?.statistics,
      snapshotQuery.isFetching,
    ]
  );
}
