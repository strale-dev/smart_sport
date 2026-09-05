import { Suspense } from "react";

import { LeagueDetailsTabs } from "@/components/league/LeagueDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Fixture,
  League,
  LeaguePlayerLeaderboardRow,
  Season,
  StandingsGroup,
} from "@/types/domain";

type LeagueDetailsTabsSectionProps = {
  league: League;
  seasons: Season[];
  seasonYear: number | null;
  standings: StandingsGroup[];
  fixtures: Fixture[];
  topScorers: LeaguePlayerLeaderboardRow[];
  topAssists: LeaguePlayerLeaderboardRow[];
};

function LeagueDetailsTabsFallback() {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 shrink-0" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function LeagueDetailsTabsSection(props: LeagueDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<LeagueDetailsTabsFallback />}>
      <LeagueDetailsTabs {...props} />
    </Suspense>
  );
}
