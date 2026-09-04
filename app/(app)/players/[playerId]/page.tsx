import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayerDetailsTabsSection } from "@/components/player/PlayerDetailsTabsSection";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerViewAnalytics } from "@/components/player/PlayerViewAnalytics";
import { parseProviderId } from "@/lib/fixtures/ids";
import { PLAYER_MATCHES_PAGE_SIZE } from "@/lib/players/constants";
import { currentFootballSeasonYear } from "@/lib/players/season";
import { parsePlayerPage } from "@/lib/players/url";
import { getPlayerById } from "@/lib/services/footballService";
import {
  emptyPlayerMatchHistoryPage,
  getPlayerCareer,
  getPlayerMatchHistory,
  getPlayerSeasonStatistics,
  pickPrimarySeasonStatistics,
} from "@/lib/services/playerProfileService";
import { getCurrentUser } from "@/lib/supabase/user";
import type { PlayerCareerEntry, PlayerSeasonStatistics } from "@/types/domain";

type PlayerPageProps = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { playerId } = await params;
  const id = parseProviderId(playerId);

  if (id == null) {
    return { title: "Player" };
  }

  const { data: player } = await getPlayerById(id);

  if (!player) {
    return { title: "Player" };
  }

  return { title: player.fullName };
}

export default async function PlayerPage({
  params,
  searchParams,
}: PlayerPageProps) {
  const [{ playerId }, query] = await Promise.all([params, searchParams]);
  const id = parseProviderId(playerId);
  const page = parsePlayerPage(query.page);

  if (id == null) {
    notFound();
  }

  const seasonYear = currentFootballSeasonYear();

  const [{ data: player }, user, seasonStatsResult, matchHistoryResult] =
    await Promise.all([
      getPlayerById(id),
      getCurrentUser(),
      getPlayerSeasonStatistics(id, seasonYear).catch((error: unknown) => {
        console.warn("[player] season statistics unavailable", error);
        return {
          data: [] as PlayerSeasonStatistics[],
          meta: { cached: false, stale: false },
        };
      }),
      getPlayerMatchHistory(id, {
        page,
        pageSize: PLAYER_MATCHES_PAGE_SIZE,
      }).catch((error: unknown) => {
        console.warn("[player] match history unavailable", error);
        return {
          data: emptyPlayerMatchHistoryPage(page, PLAYER_MATCHES_PAGE_SIZE),
          meta: { cached: false, stale: false },
        };
      }),
    ]);

  if (!player) {
    notFound();
  }

  const seasonStats = pickPrimarySeasonStatistics(
    seasonStatsResult.data,
    player,
    seasonYear
  );

  const enrichedPlayer = {
    ...player,
    averageRating: player.averageRating ?? seasonStats?.averageRating ?? null,
  };

  const careerResult = await getPlayerCareer(id, seasonStatsResult.data).catch(
    (error: unknown) => {
      console.warn("[player] career unavailable", error);
      return {
        data: [] as PlayerCareerEntry[],
        meta: { cached: false, stale: false },
      };
    }
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PlayerHeader player={enrichedPlayer} />
      <PlayerDetailsTabsSection
        player={enrichedPlayer}
        seasonStats={seasonStats}
        matchHistory={matchHistoryResult.data}
        career={careerResult.data}
      />
      <PlayerViewAnalytics player={enrichedPlayer} isGuest={!user} />
    </div>
  );
}
