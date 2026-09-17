import "server-only";

import {
  LIVE_LEAGUE_MORE,
  LIVE_LEAGUE_PROVIDER_IDS,
  LIVE_LEAGUE_TABS,
} from "@/lib/live/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type UserProfileRow = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  preferredLeagueId: string | null;
  language: string;
};

export type UserPreferencesRow = {
  notifyGoal: boolean;
  notifyFullTime: boolean;
  notifyLineupConfirmed: boolean;
  notifyPredictionShift: boolean;
  notifyAiInsightRefreshed: boolean;
  soundGoalEnabled: boolean;
  soundFullTimeEnabled: boolean;
  emailMarketingOptin: boolean;
};

export type PreferrableLeague = {
  id: string;
  name: string;
  providerId: number;
};

const PROFILE_SELECT =
  "id, email, display_name, avatar_url, timezone, preferred_league_id, language";

const PREFERENCES_SELECT =
  "notify_goal, notify_full_time, notify_lineup_confirmed, notify_prediction_shift, notify_ai_insight_refreshed, sound_goal_enabled, sound_full_time_enabled, email_marketing_optin";

function mapProfile(row: {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  preferred_league_id: string | null;
  language: string;
}): UserProfileRow {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    preferredLeagueId: row.preferred_league_id,
    language: row.language,
  };
}

function mapPreferences(row: {
  notify_goal: boolean;
  notify_full_time: boolean;
  notify_lineup_confirmed: boolean;
  notify_prediction_shift: boolean;
  notify_ai_insight_refreshed: boolean;
  sound_goal_enabled: boolean;
  sound_full_time_enabled: boolean;
  email_marketing_optin: boolean;
}): UserPreferencesRow {
  return {
    notifyGoal: row.notify_goal,
    notifyFullTime: row.notify_full_time,
    notifyLineupConfirmed: row.notify_lineup_confirmed,
    notifyPredictionShift: row.notify_prediction_shift,
    notifyAiInsightRefreshed: row.notify_ai_insight_refreshed,
    soundGoalEnabled: row.sound_goal_enabled,
    soundFullTimeEnabled: row.sound_full_time_enabled,
    emailMarketingOptin: row.email_marketing_optin,
  };
}

async function userScopedClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function readProfileForUser(
  userId: string
): Promise<UserProfileRow | null> {
  const client = await userScopedClient();

  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read profile: ${error.message}`);
  }

  return data ? mapProfile(data) : null;
}

export async function readUserPreferences(
  userId: string
): Promise<UserPreferencesRow | null> {
  const client = await userScopedClient();

  const { data, error } = await client
    .from("user_preferences")
    .select(PREFERENCES_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read user preferences: ${error.message}`);
  }

  return data ? mapPreferences(data) : null;
}

export async function readPreferredLeagueProviderId(
  userId: string
): Promise<number | null> {
  const client = await userScopedClient();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("preferred_league_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to read preferred league: ${profileError.message}`);
  }

  if (!profile?.preferred_league_id) {
    return null;
  }

  const { data: league, error: leagueError } = await client
    .from("leagues")
    .select("provider_id")
    .eq("id", profile.preferred_league_id)
    .maybeSingle();

  if (leagueError) {
    throw new Error(`Failed to read league: ${leagueError.message}`);
  }

  if (!league || !LIVE_LEAGUE_PROVIDER_IDS.has(league.provider_id)) {
    return null;
  }

  return league.provider_id;
}

export async function listPreferrableLeagues(): Promise<PreferrableLeague[]> {
  const providerOrder = [
    ...LIVE_LEAGUE_TABS.map((tab) => tab.providerId),
    ...LIVE_LEAGUE_MORE.map((tab) => tab.providerId),
  ];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leagues")
    .select("id, name, provider_id")
    .in("provider_id", [...LIVE_LEAGUE_PROVIDER_IDS]);

  if (error) {
    throw new Error(`Failed to list leagues: ${error.message}`);
  }

  const byProvider = new Map(
    (data ?? []).map((row) => [row.provider_id, row] as const)
  );

  return providerOrder
    .map((providerId) => byProvider.get(providerId))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      providerId: row.provider_id,
    }));
}

export async function isPreferrableLeagueId(
  leagueId: string | null
): Promise<boolean> {
  if (!leagueId) {
    return true;
  }

  const leagues = await listPreferrableLeagues();
  return leagues.some((league) => league.id === leagueId);
}
