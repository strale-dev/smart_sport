import { Suspense } from "react";

import { TeamDetailsTabs } from "@/components/team/TeamDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Fixture, Team } from "@/types/domain";

type TeamDetailsTabsSectionProps = {
  team: Team;
  fixtures: Fixture[];
};

function TeamDetailsTabsFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 shrink-0" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function TeamDetailsTabsSection({
  team,
  fixtures,
}: TeamDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<TeamDetailsTabsFallback />}>
      <TeamDetailsTabs team={team} fixtures={fixtures} />
    </Suspense>
  );
}
