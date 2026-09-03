import { Suspense } from "react";
import type { ReactNode } from "react";

import { MatchDetailsTabs } from "@/components/match/MatchDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";

type MatchDetailsTabsSectionProps = {
  isGuest: boolean;
  returnTo: string;
  fixtureId: number;
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
  isGuest,
  returnTo,
  fixtureId,
  overview,
  lineups,
  standings,
  matches,
}: MatchDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<MatchDetailsTabsFallback />}>
      <MatchDetailsTabs
        isGuest={isGuest}
        returnTo={returnTo}
        fixtureId={fixtureId}
        overview={overview}
        lineups={lineups}
        standings={standings}
        matches={matches}
      />
    </Suspense>
  );
}
