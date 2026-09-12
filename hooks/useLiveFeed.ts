"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
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
import type { Fixture } from "@/types/domain";

type UseLiveCenterQueryOptions = {
  params: LiveCenterParams;
  initialData: LiveCenterData;
};

export function useLiveCenterQuery({
  params,
  initialData,
}: UseLiveCenterQueryOptions) {
  const queryClient = useQueryClient();
  const documentVisible = useDocumentVisible();

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
      void queryClient.invalidateQueries({ queryKey: liveKeys.all });
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [queryClient]);

  return query;
}

type UseDashboardLiveQueryOptions = {
  initialLive: Fixture[];
};

export function useDashboardLiveQuery({
  initialLive,
}: UseDashboardLiveQueryOptions) {
  const queryClient = useQueryClient();
  const documentVisible = useDocumentVisible();

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
      void queryClient.invalidateQueries({
        queryKey: liveKeys.dashboardLive(),
      });
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [queryClient]);

  return query;
}
