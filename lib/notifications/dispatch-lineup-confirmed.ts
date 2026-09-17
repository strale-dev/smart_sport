import {
  filterUserIdsByNotificationPreference,
  listTeamFollowerUserIds,
} from "@/lib/notifications/audience";
import {
  buildNotificationCopy,
  fixtureLinkPayload,
} from "@/lib/notifications/copy";
import { buildNotificationDedupeKey } from "@/lib/notifications/dedupe";
import { loadNotificationFixtureContext } from "@/lib/notifications/fixture-context";
import {
  enqueueManyNotifications,
  type EnqueueManyItem,
} from "@/lib/services/notificationService";
import { createAdminClient } from "@/lib/supabase/admin";

export async function dispatchLineupConfirmedNotifications(
  fixtureProviderId: number
): Promise<void> {
  const admin = createAdminClient();
  const context = await loadNotificationFixtureContext(fixtureProviderId);
  if (!context) {
    return;
  }

  const { data: lineups, error } = await admin
    .from("lineups")
    .select("team_id, is_confirmed")
    .eq("fixture_id", context.fixtureId);

  if (error) {
    throw new Error(`lineup_confirm_check_failed: ${error.message}`);
  }

  const confirmedTeamIds = new Set(
    (lineups ?? [])
      .filter((row) => row.is_confirmed && row.team_id)
      .map((row) => row.team_id as string)
  );

  if (confirmedTeamIds.size === 0) {
    return;
  }

  const teams = {
    homeName: context.homeTeam.name,
    awayName: context.awayTeam.name,
    fixtureProviderId: context.fixtureProviderId,
  };

  const items: EnqueueManyItem[] = [];
  const copy = buildNotificationCopy("LINEUP_CONFIRMED", teams);
  const dedupeKey = buildNotificationDedupeKey("LINEUP_CONFIRMED", [
    context.fixtureId,
  ]);

  for (const team of [context.homeTeam, context.awayTeam]) {
    if (!confirmedTeamIds.has(team.id)) {
      continue;
    }

    const followerIds = await listTeamFollowerUserIds(team.id);
    const allowed = await filterUserIdsByNotificationPreference(
      followerIds,
      "LINEUP_CONFIRMED"
    );

    for (const userId of allowed) {
      items.push({
        userId,
        kind: "LINEUP_CONFIRMED",
        title: copy.title,
        body: copy.body,
        fixtureId: context.fixtureId,
        teamId: team.id,
        dedupeKey,
        payload: fixtureLinkPayload(context.fixtureProviderId, {
          teamProviderId: team.providerId,
        }),
        skipPreferenceCheck: true,
      });
    }
  }

  if (items.length > 0) {
    await enqueueManyNotifications(items);
  }
}
