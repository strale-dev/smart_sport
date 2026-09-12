"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { LIVE_FALLBACK_REFETCH_MS } from "@/lib/live/constants";
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
  const queryClient = useQueryClient();
  const documentVisible = useDocumentVisible();
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

    const stopBroadcast = subscribeMatchBroadcast(fixtureProviderId, () => {
      void queryClient.invalidateQueries({
        queryKey: liveKeys.fixture(fixtureProviderId),
      });
      void queryClient.invalidateQueries({
        queryKey: liveKeys.fixtureSnapshot(fixtureProviderId),
      });
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [fixtureProviderId, isLive, queryClient]);

  const fixture =
    snapshotQuery.data?.fixture ?? options.initialSnapshot?.fixture ?? null;

  return {
    fixture,
    events: snapshotQuery.data?.events ?? options.initialSnapshot?.events ?? [],
    statistics:
      snapshotQuery.data?.statistics ??
      options.initialSnapshot?.statistics ??
      [],
    isFetching: snapshotQuery.isFetching,
    isLive,
  };
}
