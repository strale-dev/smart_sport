import type { NotificationKind } from "@/lib/notifications/dedupe";
import { isNotificationKindEnabled } from "@/lib/notifications/preferences";
import { createAdminClient } from "@/lib/supabase/admin";

export async function listTeamFollowerUserIds(
  teamId: string
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("follows")
    .select("user_id")
    .eq("object_type", "TEAM")
    .eq("team_id", teamId);

  if (error) {
    throw new Error(`list_team_followers_failed: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.user_id))];
}

export async function listWatchedMatchUserIds(
  fixtureId: string,
  homeTeamId: string,
  awayTeamId: string
): Promise<string[]> {
  const admin = createAdminClient();

  const [favoritesResult, followsResult] = await Promise.all([
    admin.from("favorites").select("user_id").eq("fixture_id", fixtureId),
    admin
      .from("follows")
      .select("user_id")
      .eq("object_type", "TEAM")
      .in("team_id", [homeTeamId, awayTeamId]),
  ]);

  if (favoritesResult.error) {
    throw new Error(
      `list_watched_favorites_failed: ${favoritesResult.error.message}`
    );
  }
  if (followsResult.error) {
    throw new Error(
      `list_watched_follows_failed: ${followsResult.error.message}`
    );
  }

  const ids = new Set<string>();
  for (const row of favoritesResult.data ?? []) {
    ids.add(row.user_id);
  }
  for (const row of followsResult.data ?? []) {
    ids.add(row.user_id);
  }

  return [...ids];
}

export async function filterUserIdsByNotificationPreference(
  userIds: string[],
  kind: NotificationKind
): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_preferences")
    .select(
      "user_id, notify_goal, notify_full_time, notify_lineup_confirmed, notify_prediction_shift, notify_ai_insight_refreshed"
    )
    .in("user_id", userIds);

  if (error) {
    throw new Error(`filter_notification_prefs_failed: ${error.message}`);
  }

  const prefsByUser = new Map((data ?? []).map((row) => [row.user_id, row]));
  return userIds.filter((userId) => {
    const prefs = prefsByUser.get(userId);
    if (!prefs) {
      return true;
    }
    return isNotificationKindEnabled(prefs, kind);
  });
}

export async function listLiveFixtureProviderIdsWithTeamFollowers(): Promise<
  number[]
> {
  const admin = createAdminClient();
  const liveStatuses = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"] as const;

  const { data: fixtures, error: fixturesError } = await admin
    .from("fixtures")
    .select("provider_id, home_team_id, away_team_id")
    .in("status", [...liveStatuses])
    .not("provider_id", "is", null);

  if (fixturesError) {
    throw new Error(
      `list_live_fixtures_for_follow_notify_failed: ${fixturesError.message}`
    );
  }

  if (!fixtures?.length) {
    return [];
  }

  const teamIds = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.home_team_id) {
      teamIds.add(fixture.home_team_id);
    }
    if (fixture.away_team_id) {
      teamIds.add(fixture.away_team_id);
    }
  }

  if (teamIds.size === 0) {
    return [];
  }

  const { data: followedTeams, error: followsError } = await admin
    .from("follows")
    .select("team_id")
    .eq("object_type", "TEAM")
    .in("team_id", [...teamIds]);

  if (followsError) {
    throw new Error(
      `list_followed_teams_for_notify_failed: ${followsError.message}`
    );
  }

  const followedTeamSet = new Set(
    (followedTeams ?? [])
      .map((row) => row.team_id)
      .filter((id): id is string => id != null)
  );

  const providerIds = new Set<number>();
  for (const fixture of fixtures) {
    const homeFollowed =
      fixture.home_team_id != null && followedTeamSet.has(fixture.home_team_id);
    const awayFollowed =
      fixture.away_team_id != null && followedTeamSet.has(fixture.away_team_id);
    if ((homeFollowed || awayFollowed) && fixture.provider_id != null) {
      providerIds.add(fixture.provider_id);
    }
  }

  return [...providerIds];
}
