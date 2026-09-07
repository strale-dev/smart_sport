import { Suspense } from "react";
import type { ReactNode } from "react";

import { MatchDetailsTabs } from "@/components/match/MatchDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamRef } from "@/types/domain";

type MatchDetailsTabsSectionProps = {
  fixtureId: number;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  overview: ReactNode;
  lineups: ReactNode;
  standings: ReactNode;
  matches: ReactNode;
};

function MatchDetailsTabsFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 shrink-0" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function MatchDetailsTabsSection({
  fixtureId,
  homeTeam,
  awayTeam,
  overview,
  lineups,
  standings,
  matches,
}: MatchDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<MatchDetailsTabsFallback />}>
      <MatchDetailsTabs
        fixtureId={fixtureId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        overview={overview}
        lineups={lineups}
        standings={standings}
        matches={matches}
      />
    </Suspense>
  );
}
