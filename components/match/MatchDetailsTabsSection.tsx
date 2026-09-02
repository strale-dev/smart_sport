import { Suspense } from "react";

import { MatchDetailsTabs } from "@/components/match/MatchDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";

type MatchDetailsTabsSectionProps = {
  isGuest: boolean;
  returnTo: string;
};

function MatchDetailsTabsFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 shrink-0" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function MatchDetailsTabsSection({
  isGuest,
  returnTo,
}: MatchDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<MatchDetailsTabsFallback />}>
      <MatchDetailsTabs isGuest={isGuest} returnTo={returnTo} />
    </Suspense>
  );
}
