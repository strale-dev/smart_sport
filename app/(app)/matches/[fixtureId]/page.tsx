import type { Metadata } from "next";
import { TrophyIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

type MatchPageProps = {
  params: Promise<{ fixtureId: string }>;
};

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { fixtureId } = await params;

  return {
    title: `Match ${fixtureId}`,
  };
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { fixtureId } = await params;

  return (
    <EmptyState
      icon={TrophyIcon}
      title="Match details coming soon"
      description={`Fixture #${fixtureId} — stats, timeline, and lineups will load here.`}
    />
  );
}
