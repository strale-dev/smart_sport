import { Suspense } from "react";

import { PlayerDetailsTabs } from "@/components/player/PlayerDetailsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Player,
  PlayerCareerEntry,
  PlayerMatchHistoryPage,
  PlayerSeasonStatistics,
} from "@/types/domain";

type PlayerDetailsTabsSectionProps = {
  player: Player;
  seasonStats: PlayerSeasonStatistics | null;
  matchHistory: PlayerMatchHistoryPage;
  career: PlayerCareerEntry[];
};

function PlayerDetailsTabsFallback() {
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

export function PlayerDetailsTabsSection({
  player,
  seasonStats,
  matchHistory,
  career,
}: PlayerDetailsTabsSectionProps) {
  return (
    <Suspense fallback={<PlayerDetailsTabsFallback />}>
      <PlayerDetailsTabs
        player={player}
        seasonStats={seasonStats}
        matchHistory={matchHistory}
        career={career}
      />
    </Suspense>
  );
}
