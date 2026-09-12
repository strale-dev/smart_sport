"use client";

import { MatchRow } from "@/components/match/MatchRow";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { useDashboardLiveQuery } from "@/hooks/useLiveFeed";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";

type DashboardLiveSectionProps = {
  initialLive: LiveFixtureRow[];
};

export function DashboardLiveSection({
  initialLive,
}: DashboardLiveSectionProps) {
  const { data: live } = useDashboardLiveQuery({ initialLive });

  return (
    <DashboardSection
      title="Live now"
      actionHref="/live"
      actionLabel="Live Center"
    >
      {live.length > 0 ? (
        <div className="space-y-2">
          {live.map((fixture) => (
            <MatchRow key={fixture.externalId} fixture={fixture} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No live matches right now.
        </p>
      )}
    </DashboardSection>
  );
}
