import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MatchDetailsTabsSection } from "@/components/match/MatchDetailsTabsSection";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchViewAnalytics } from "@/components/match/MatchViewAnalytics";
import { parseFixtureId } from "@/lib/fixtures/ids";
import { getFixtureById } from "@/lib/services/footballService";
import { getCurrentUser } from "@/lib/supabase/user";

type MatchPageProps = {
  params: Promise<{ fixtureId: string }>;
};

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { fixtureId } = await params;
  const id = parseFixtureId(fixtureId);

  if (id == null) {
    return { title: "Match" };
  }

  const { data: fixture } = await getFixtureById(id);

  if (!fixture) {
    return { title: "Match" };
  }

  return {
    title: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
  };
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { fixtureId } = await params;
  const id = parseFixtureId(fixtureId);

  // redirect() throws internally — never wrap these calls in try/catch.
  if (id == null) {
    redirect("/fixtures?notice=match_not_found");
  }

  const { data: fixture } = await getFixtureById(id);

  if (!fixture) {
    redirect("/fixtures?notice=match_not_found");
  }

  const user = await getCurrentUser();
  const returnTo = `/matches/${id}`;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <MatchHeader fixture={fixture} />

      <MatchDetailsTabsSection isGuest={!user} returnTo={returnTo} />

      <MatchViewAnalytics fixture={fixture} isGuest={!user} />
    </div>
  );
}
