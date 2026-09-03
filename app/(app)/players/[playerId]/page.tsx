import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayerDetailsTabsSection } from "@/components/player/PlayerDetailsTabsSection";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerViewAnalytics } from "@/components/player/PlayerViewAnalytics";
import { parseProviderId } from "@/lib/fixtures/ids";
import { getPlayerById } from "@/lib/services/footballService";
import { getCurrentUser } from "@/lib/supabase/user";

type PlayerPageProps = {
  params: Promise<{ playerId: string }>;
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

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { playerId } = await params;
  const id = parseProviderId(playerId);

  if (id == null) {
    notFound();
  }

  const [{ data: player }, user] = await Promise.all([
    getPlayerById(id),
    getCurrentUser(),
  ]);

  if (!player) {
    notFound();
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PlayerHeader player={player} />
      <PlayerDetailsTabsSection player={player} />
      <PlayerViewAnalytics player={player} isGuest={!user} />
    </div>
  );
}
