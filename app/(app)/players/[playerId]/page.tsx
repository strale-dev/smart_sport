import type { Metadata } from "next";
import { UserIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

type PlayerPageProps = {
  params: Promise<{ playerId: string }>;
};

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { playerId } = await params;

  return {
    title: `Player ${playerId}`,
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { playerId } = await params;

  return (
    <EmptyState
      icon={UserIcon}
      title="Player profile coming soon"
      description={`Player #${playerId} — stats, matches, and attributes will appear here.`}
    />
  );
}
