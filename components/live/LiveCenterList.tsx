"use client";

import { useSyncExternalStore } from "react";

import { LiveUpcomingSection } from "@/components/live/LiveUpcomingSection";
import { MatchRow } from "@/components/match/MatchRow";
import {
  getLiveCenterServerSnapshot,
  getLiveCenterSnapshot,
  subscribeLiveCenterData,
} from "@/lib/live/live-center-store";
import { buildLiveCenterApiHref } from "@/lib/live/url";
import type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/services/liveService";

type LiveCenterListProps = {
  initialData: LiveCenterData;
  params: LiveCenterParams;
};

export function LiveCenterList({ initialData, params }: LiveCenterListProps) {
  const apiHref = buildLiveCenterApiHref(params);

  const data = useSyncExternalStore(
    (onStoreChange) =>
      subscribeLiveCenterData(apiHref, initialData, onStoreChange),
    () => getLiveCenterSnapshot(apiHref, initialData),
    () => getLiveCenterServerSnapshot(initialData)
  );

  if (data.fixtures.length === 0) {
    return <LiveUpcomingSection upcomingSoon={data.upcomingSoon} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {data.totalCount === 1
          ? "1 live match"
          : `${data.totalCount} live matches`}
      </p>
      <div className="space-y-2">
        {data.fixtures.map((fixture) => (
          <MatchRow key={fixture.externalId} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}
