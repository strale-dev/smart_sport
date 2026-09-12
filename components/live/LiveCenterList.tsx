"use client";

import { LiveUpcomingSection } from "@/components/live/LiveUpcomingSection";
import { MatchRow } from "@/components/match/MatchRow";
import { useLiveCenterQuery } from "@/hooks/useLiveFeed";
import type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/services/liveService";

type LiveCenterListProps = {
  initialData: LiveCenterData;
  params: LiveCenterParams;
};

export function LiveCenterList({ initialData, params }: LiveCenterListProps) {
  const { data } = useLiveCenterQuery({ params, initialData });

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
