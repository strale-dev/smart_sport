import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TeamDetailsTabsSection } from "@/components/team/TeamDetailsTabsSection";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamViewAnalytics } from "@/components/team/TeamViewAnalytics";
import { parseProviderId } from "@/lib/fixtures/ids";
import {
  getFixturesForTeam,
  getTeamById,
} from "@/lib/services/footballService";
import { getCurrentUser } from "@/lib/supabase/user";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const id = parseProviderId(teamId);

  if (id == null) {
    return { title: "Team" };
  }

  const { data: team } = await getTeamById(id);

  if (!team) {
    return { title: "Team" };
  }

  return { title: team.name };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const id = parseProviderId(teamId);

  if (id == null) {
    notFound();
  }

  const [{ data: team }, { data: fixtures }, user] = await Promise.all([
    getTeamById(id),
    getFixturesForTeam(id),
    getCurrentUser(),
  ]);

  if (!team) {
    notFound();
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <TeamHeader team={team} />
      <TeamDetailsTabsSection team={team} fixtures={fixtures} />
      <TeamViewAnalytics team={team} isGuest={!user} />
    </div>
  );
}
