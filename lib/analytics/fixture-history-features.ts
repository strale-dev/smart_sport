import { buildFixtureH2HFeatures } from "@/lib/analytics/fixture-h2h-features";
import type { FixtureHistoryFeatures } from "@/lib/analytics/history-feature-types";
import { buildTeamHistoryFeatures } from "@/lib/analytics/team-history-features";
import { createAdminClient } from "@/lib/supabase/admin";

type FixtureContextRow = {
  provider_id: number;
  kickoff_at: string;
  home_team_id: string;
  away_team_id: string;
  league_id: string;
  home_team: { provider_id: number };
  away_team: { provider_id: number };
  league: { provider_id: number };
};

async function loadFixtureContext(
  fixtureExternalId: number
): Promise<FixtureContextRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      provider_id,
      kickoff_at,
      home_team_id,
      away_team_id,
      league_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id),
      away_team:teams!fixtures_away_team_id_fkey (provider_id),
      league:leagues (provider_id)
    `
    )
    .eq("provider_id", fixtureExternalId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load fixture ${fixtureExternalId}: ${error.message}`
    );
  }

  if (!data?.home_team || !data.away_team || !data.league) {
    return null;
  }

  const home = Array.isArray(data.home_team)
    ? data.home_team[0]
    : data.home_team;
  const away = Array.isArray(data.away_team)
    ? data.away_team[0]
    : data.away_team;
  const league = Array.isArray(data.league) ? data.league[0] : data.league;
  if (!home || !away || !league) {
    return null;
  }

  return {
    provider_id: data.provider_id,
    kickoff_at: data.kickoff_at,
    home_team_id: data.home_team_id,
    away_team_id: data.away_team_id,
    league_id: data.league_id,
    home_team: home,
    away_team: away,
    league,
  };
}

export async function buildFixtureHistoryFeatures(
  fixtureExternalId: number,
  options?: { asOf?: string; allowCrossCompetition?: boolean }
): Promise<FixtureHistoryFeatures | null> {
  const context = await loadFixtureContext(fixtureExternalId);
  if (!context) {
    return null;
  }

  const beforeAt = options?.asOf ?? context.kickoff_at;
  const leagueProviderId = context.league.provider_id;

  const [home, away, h2hAll, h2hComp] = await Promise.all([
    buildTeamHistoryFeatures({
      teamProviderId: context.home_team.provider_id,
      teamUuid: context.home_team_id,
      beforeAt,
      leagueProviderId,
      allowCrossCompetition: options?.allowCrossCompetition,
    }),
    buildTeamHistoryFeatures({
      teamProviderId: context.away_team.provider_id,
      teamUuid: context.away_team_id,
      beforeAt,
      leagueProviderId,
      allowCrossCompetition: options?.allowCrossCompetition,
    }),
    buildFixtureH2HFeatures({
      homeTeamProviderId: context.home_team.provider_id,
      awayTeamProviderId: context.away_team.provider_id,
      homeTeamUuid: context.home_team_id,
      awayTeamUuid: context.away_team_id,
      beforeAt,
      scope: "ALL",
    }),
    buildFixtureH2HFeatures({
      homeTeamProviderId: context.home_team.provider_id,
      awayTeamProviderId: context.away_team.provider_id,
      homeTeamUuid: context.home_team_id,
      awayTeamUuid: context.away_team_id,
      beforeAt,
      scope: "SAME_COMP",
      leagueUuid: context.league_id,
    }),
  ]);

  const h2h =
    h2hComp.dataState === "available" && h2hComp.meetingsInWindow > 0
      ? h2hComp
      : h2hAll;

  return {
    fixtureExternalId,
    beforeAt,
    leagueProviderId,
    home,
    away,
    h2h,
  };
}
