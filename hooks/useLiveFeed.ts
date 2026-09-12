"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { useDebouncedQueryInvalidator } from "@/lib/live/debounced-invalidate";
import {
  LIVE_FALLBACK_REFETCH_MS,
  LIVE_POLL_INTERVAL_MS,
} from "@/lib/live/constants";
import { fetchDashboardLive, fetchLiveCenterData } from "@/lib/live/live-fetch";
import { liveKeys } from "@/lib/live/query-keys";
import { subscribeLiveFeedBroadcast } from "@/lib/live/subscribe-broadcast";
import { startLiveWatchSession } from "@/lib/live/watch-client";
import type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/live/live-center-types";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";

type UseLiveCenterQueryOptions = {
  params: LiveCenterParams;
  initialData: LiveCenterData;
};

export function useLiveCenterQuery({
  params,
  initialData,
}: UseLiveCenterQueryOptions) {
  const documentVisible = useDocumentVisible();
  const debouncedInvalidate = useDebouncedQueryInvalidator();

  const query = useQuery({
    queryKey: liveKeys.center(params),
    queryFn: () => fetchLiveCenterData(params),
    initialData,
    refetchInterval: documentVisible ? LIVE_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const stopWatch = startLiveWatchSession({ surface: "live-center" });

    const stopBroadcast = subscribeLiveFeedBroadcast(() => {
      debouncedInvalidate([liveKeys.all]);
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [debouncedInvalidate]);

  return query;
}

type UseDashboardLiveQueryOptions = {
  initialLive: LiveFixtureRow[];
};

export function useDashboardLiveQuery({
  initialLive,
}: UseDashboardLiveQueryOptions) {
  const documentVisible = useDocumentVisible();
  const debouncedInvalidate = useDebouncedQueryInvalidator();

  const query = useQuery({
    queryKey: liveKeys.dashboardLive(),
    queryFn: async () => {
      const { live } = await fetchDashboardLive();
      return live;
    },
    initialData: initialLive,
    refetchInterval: documentVisible ? LIVE_FALLBACK_REFETCH_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const stopWatch = startLiveWatchSession({ surface: "live-center" });

    const stopBroadcast = subscribeLiveFeedBroadcast(() => {
      debouncedInvalidate([liveKeys.dashboardLive()]);
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [debouncedInvalidate]);

  return query;
}
