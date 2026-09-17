import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationFixtureContext = {
  fixtureId: string;
  fixtureProviderId: number;
  homeTeam: { id: string; providerId: number; name: string };
  awayTeam: { id: string; providerId: number; name: string };
};

export async function loadNotificationFixtureContext(
  fixtureProviderId: number
): Promise<NotificationFixtureContext | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      home_team:teams!fixtures_home_team_id_fkey (id, provider_id, name),
      away_team:teams!fixtures_away_team_id_fkey (id, provider_id, name)
    `
    )
    .eq("provider_id", fixtureProviderId)
    .maybeSingle();

  if (error) {
    throw new Error(`notification_fixture_context_failed: ${error.message}`);
  }

  if (!data?.id || data.provider_id == null) {
    return null;
  }

  const home = Array.isArray(data.home_team)
    ? data.home_team[0]
    : data.home_team;
  const away = Array.isArray(data.away_team)
    ? data.away_team[0]
    : data.away_team;

  if (
    !home?.id ||
    home.provider_id == null ||
    !away?.id ||
    away.provider_id == null
  ) {
    return null;
  }

  return {
    fixtureId: data.id,
    fixtureProviderId: data.provider_id,
    homeTeam: {
      id: home.id,
      providerId: home.provider_id,
      name: home.name,
    },
    awayTeam: {
      id: away.id,
      providerId: away.provider_id,
      name: away.name,
    },
  };
}

export function teamFromExternalId(
  context: NotificationFixtureContext,
  teamExternalId: number | null
): NotificationFixtureContext["homeTeam"] | null {
  if (teamExternalId == null) {
    return null;
  }
  if (context.homeTeam.providerId === teamExternalId) {
    return context.homeTeam;
  }
  if (context.awayTeam.providerId === teamExternalId) {
    return context.awayTeam;
  }
  return null;
}
