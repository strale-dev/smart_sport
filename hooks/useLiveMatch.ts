"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { useDebouncedQueryInvalidator } from "@/lib/live/debounced-invalidate";
import { LIVE_FALLBACK_REFETCH_MS } from "@/lib/live/constants";
import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import {
  fetchMatchSnapshot,
  type MatchLiveSnapshot,
} from "@/lib/live/live-fetch";
import { liveKeys } from "@/lib/live/query-keys";
import { subscribeMatchBroadcast } from "@/lib/live/subscribe-broadcast";
import { startLiveWatchSession } from "@/lib/live/watch-client";
import { isLiveFixtureStatus } from "@/lib/redis/keys";

type UseLiveMatchOptions = {
  initialSnapshot?: MatchLiveSnapshot;
};

export function useLiveMatch(
  fixtureProviderId: number,
  fixtureStatus: string,
  options: UseLiveMatchOptions = {}
) {
  const documentVisible = useDocumentVisible();
  const debouncedInvalidate = useDebouncedQueryInvalidator();
  const [lastMeaningfulEvent, setLastMeaningfulEvent] =
    useState<MeaningfulEventBroadcastPayload | null>(null);

  const isLive = isLiveFixtureStatus(
    fixtureStatus as Parameters<typeof isLiveFixtureStatus>[0]
  );

  const snapshotQuery = useQuery({
    queryKey: liveKeys.fixtureSnapshot(fixtureProviderId),
    queryFn: () => fetchMatchSnapshot(fixtureProviderId),
    initialData: options.initialSnapshot,
    enabled: isLive,
    refetchInterval:
      isLive && documentVisible ? LIVE_FALLBACK_REFETCH_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const stopWatch = startLiveWatchSession({
      surface: "match",
      fixtureProviderId,
    });

    const stopBroadcast = subscribeMatchBroadcast(
      fixtureProviderId,
      (payload) => {
        const events = payload.meaningfulEvents;
        if (events && events.length > 0) {
          setLastMeaningfulEvent(events[events.length - 1] ?? null);
        }

        debouncedInvalidate([
          liveKeys.fixtureSnapshot(fixtureProviderId),
          liveKeys.liveInsight(fixtureProviderId),
          liveKeys.probabilityDelta(fixtureProviderId),
        ]);
      }
    );

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [debouncedInvalidate, fixtureProviderId, isLive]);

  const fixture =
    snapshotQuery.data?.fixture ?? options.initialSnapshot?.fixture ?? null;

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
