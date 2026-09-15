import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FollowToggle } from "@/components/follow/FollowToggle";
import { TeamDetailsTabsSection } from "@/components/team/TeamDetailsTabsSection";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamViewAnalytics } from "@/components/team/TeamViewAnalytics";
import { aggregateForm } from "@/lib/analytics/compute-form";
import { parseProviderId } from "@/lib/fixtures/ids";
import { getRecentForm } from "@/lib/services/analyticsService";
import {
  getFixturesForTeam,
  getStandings,
  getTeamById,
  getTeamSeasonStatistics,
  getTeamSquad,
  listSeasonsByLeague,
} from "@/lib/services/footballService";
import {
  buildTeamPrimaryContext,
  resolvePrimaryLeagueFromFixtures,
} from "@/lib/teams/resolve-primary-league";
import { isFollowingProvider } from "@/lib/services/followService";
import { getCurrentUser } from "@/lib/supabase/user";
import type {
  FormScope,
  FormSnapshot,
  SquadPlayer,
  StandingsGroup,
  TeamSeasonStatistics,
} from "@/types/domain";

function emptyFormSnapshot(matches: 5 | 10, scope: FormScope): FormSnapshot {
  return aggregateForm([], scope, matches);
}

async function loadTeamRecentForm(
  teamProviderId: number,
  options: { matches: 5 | 10; scope: FormScope }
): Promise<FormSnapshot> {
  try {
    return await getRecentForm(teamProviderId, options);
  } catch (error: unknown) {
    console.warn("[team] recent form unavailable", error);
    return emptyFormSnapshot(options.matches, options.scope);
  }
}

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

  try {
    const { data: team } = await getTeamById(id);
    if (!team) {
      return { title: "Team" };
    }
    return { title: team.name };
  } catch (error: unknown) {
    console.warn("[team] metadata lookup failed", error);
    return { title: "Team" };
  }
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

  const primaryLeague = resolvePrimaryLeagueFromFixtures(fixtures);
  const seasonsResult = primaryLeague
    ? await listSeasonsByLeague(primaryLeague.leagueExternalId).catch(
        (error: unknown) => {
          console.warn("[team] seasons unavailable", error);
          return { data: [] };
        }
      )
    : { data: [] };
  const seasonYear =
    primaryLeague?.seasonYear ??
    seasonsResult.data.find((season) => season.isCurrent)?.year ??
    seasonsResult.data[0]?.year ??
    null;

  const [
    form5All,
    form10All,
    form5Home,
    form10Home,
    form5Away,
    form10Away,
    standingsResult,
    squadResult,
    seasonStatsResult,
  ] = await Promise.all([
    loadTeamRecentForm(id, { matches: 5, scope: "ALL" }),
    loadTeamRecentForm(id, { matches: 10, scope: "ALL" }),
    loadTeamRecentForm(id, { matches: 5, scope: "HOME" }),
    loadTeamRecentForm(id, { matches: 10, scope: "HOME" }),
    loadTeamRecentForm(id, { matches: 5, scope: "AWAY" }),
    loadTeamRecentForm(id, { matches: 10, scope: "AWAY" }),
    primaryLeague && seasonYear != null
      ? getStandings(primaryLeague.leagueExternalId, seasonYear).catch(
          (error: unknown) => {
            console.warn("[team] standings unavailable", error);
            return {
              data: [] as StandingsGroup[],
              meta: { cached: false, stale: false },
            };
          }
        )
      : Promise.resolve({
          data: [] as StandingsGroup[],
          meta: { cached: false, stale: false },
        }),
    getTeamSquad(id).catch((error: unknown) => {
      console.warn("[team] squad unavailable", error);
      return {
        data: [] as SquadPlayer[],
        meta: { cached: false, stale: false },
      };
    }),
    primaryLeague && seasonYear != null
      ? getTeamSeasonStatistics(
          id,
          primaryLeague.leagueExternalId,
          seasonYear
        ).catch((error: unknown) => {
          console.warn("[team] season statistics unavailable", error);
          return {
            data: null as TeamSeasonStatistics | null,
            meta: { cached: false, stale: false },
          };
        })
      : Promise.resolve({
          data: null as TeamSeasonStatistics | null,
          meta: { cached: false, stale: false },
        }),
  ]);

  const primaryContext = buildTeamPrimaryContext(
    fixtures,
    standingsResult.data,
    id,
    seasonsResult.data
  );

  const returnTo = `/teams/${id}`;
  const initialFollowing = user
    ? await isFollowingProvider(user.id, {
        objectType: "TEAM",
        providerId: id,
      }).catch(() => false)
    : false;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <TeamHeader
        team={team}
        primaryContext={primaryContext}
        followControl={
          <FollowToggle
            objectType="TEAM"
            providerId={id}
            initialFollowing={initialFollowing}
            isAuthenticated={Boolean(user)}
            returnTo={returnTo}
          />
        }
      />
      <TeamDetailsTabsSection
        team={team}
        fixtures={fixtures}
        primaryContext={primaryContext}
        standings={standingsResult.data}
        squad={squadResult.data}
        seasonStats={seasonStatsResult.data}
        form5All={form5All}
        form10All={form10All}
        form5Home={form5Home}
        form10Home={form10Home}
        form5Away={form5Away}
        form10Away={form10Away}
      />
      <TeamViewAnalytics team={team} isGuest={!user} />
    </div>
  );
}
