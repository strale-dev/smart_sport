import type { Metadata } from "next";
import { ShieldIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { teamId } = await params;

  return {
    title: `Team ${teamId}`,
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;

  return (
    <EmptyState
      icon={ShieldIcon}
      title="Team profile coming soon"
      description={`Team #${teamId} — squad, form, and match history will appear here.`}
    />
  );
}
