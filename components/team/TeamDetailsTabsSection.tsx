import { Suspense } from "react";

import { TeamDetailsTabs } from "@/components/team/TeamDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamPrimaryContext } from "@/lib/teams/resolve-primary-league";
import type {
  Fixture,
  FormSnapshot,
  SquadPlayer,
  StandingsGroup,
  Team,
  TeamSeasonStatistics,
} from "@/types/domain";

type TeamDetailsTabsSectionProps = {
  team: Team;
  fixtures: Fixture[];
  primaryContext: TeamPrimaryContext | null;
  standings: StandingsGroup[];
  squad: SquadPlayer[];
  seasonStats: TeamSeasonStatistics | null;
  form5All: FormSnapshot;
  form10All: FormSnapshot;
  form5Home: FormSnapshot;
  form10Home: FormSnapshot;
  form5Away: FormSnapshot;
  form10Away: FormSnapshot;
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

export function TeamDetailsTabsSection(props: TeamDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<TeamDetailsTabsFallback />}>
      <TeamDetailsTabs {...props} />
    </Suspense>
  );
}
