"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { fetchFixturesData } from "@/lib/fixtures/fixtures-fetch";
import { fixturesKeys } from "@/lib/fixtures/query-keys";
import type { FixturesSearchParams } from "@/lib/fixtures/url";
import { useDebouncedQueryInvalidator } from "@/lib/live/debounced-invalidate";
import { LIVE_FALLBACK_REFETCH_MS } from "@/lib/live/constants";
import { subscribeLiveFeedBroadcast } from "@/lib/live/subscribe-broadcast";
import { startLiveWatchSession } from "@/lib/live/watch-client";
import { CACHE_TTL } from "@/lib/redis/keys";
import type { FixturesData } from "@/lib/services/fixturesService";

type UseFixturesQueryOptions = {
  params: FixturesSearchParams;
  timeZone: string;
  initialData: FixturesData;
};

export function useFixturesQuery({
  params,
  timeZone,
  initialData,
}: UseFixturesQueryOptions) {
  const documentVisible = useDocumentVisible();
  const debouncedInvalidate = useDebouncedQueryInvalidator();

  const query = useQuery({
    queryKey: fixturesKeys.list(params, timeZone),
    queryFn: () => fetchFixturesData(params),
    initialData,
    staleTime: CACHE_TTL.fixturesDateFresh * 1000,
    refetchOnMount: false,
    refetchInterval: (currentQuery) => {
      if (!documentVisible) {
        return false;
      }

      const liveCount = currentQuery.state.data?.liveLeagueIds.length ?? 0;
      return liveCount > 0 ? LIVE_FALLBACK_REFETCH_MS : false;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const stopWatch = startLiveWatchSession({ surface: "live-center" });

    const stopBroadcast = subscribeLiveFeedBroadcast(() => {
      debouncedInvalidate([fixturesKeys.list(params, timeZone)]);
    });

    return () => {
      stopBroadcast();
      stopWatch();
    };
  }, [debouncedInvalidate, params, timeZone]);

  return query;
}
