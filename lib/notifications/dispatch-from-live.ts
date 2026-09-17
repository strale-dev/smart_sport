import {
  filterUserIdsByNotificationPreference,
  listTeamFollowerUserIds,
  listWatchedMatchUserIds,
} from "@/lib/notifications/audience";
import {
  buildNotificationCopy,
  fixtureLinkPayload,
} from "@/lib/notifications/copy";
import { buildNotificationDedupeKey } from "@/lib/notifications/dedupe";
import {
  loadNotificationFixtureContext,
  teamFromExternalId,
} from "@/lib/notifications/fixture-context";
import type { MeaningfulEventPipelineResult } from "@/lib/live/meaningful-event-pipeline";
import type { LiveDetectorSnapshot } from "@/lib/live/event-detector-types";
import { isFinishedFixtureStatus, isLiveFixtureStatus } from "@/lib/redis/keys";
import {
  enqueueManyNotifications,
  type EnqueueManyItem,
} from "@/lib/services/notificationService";
import type { FixtureStatus } from "@/types/domain";

export type DispatchNotificationsFromLiveInput = {
  fixtureProviderId: number;
  prevSnapshot: LiveDetectorSnapshot | null;
  nextSnapshot: LiveDetectorSnapshot;
  pipelineResult: MeaningfulEventPipelineResult;
};

function statusAsFixtureStatus(value: string): FixtureStatus {
  return value as FixtureStatus;
}

export async function dispatchNotificationsFromLive(
  input: DispatchNotificationsFromLiveInput
): Promise<void> {
  const context = await loadNotificationFixtureContext(input.fixtureProviderId);
  if (!context) {
    return;
  }

  const items: EnqueueManyItem[] = [];
  const teams = {
    homeName: context.homeTeam.name,
    awayName: context.awayTeam.name,
    fixtureProviderId: context.fixtureProviderId,
  };

  for (const event of input.pipelineResult.detectResult.events) {
    if (event.kind !== "GOAL") {
      continue;
    }

    const scoringTeam = teamFromExternalId(context, event.teamExternalId);
    if (!scoringTeam) {
      continue;
    }

    const followerIds = await listTeamFollowerUserIds(scoringTeam.id);
    const allowed = await filterUserIdsByNotificationPreference(
      followerIds,
      "GOAL_FOR_FOLLOWED_TEAM"
    );

    const dedupeSuffix = event.externalEventId
      ? `${context.fixtureId}:${event.externalEventId}`
      : `${context.fixtureId}:${scoringTeam.id}:${event.minute ?? "na"}`;

    const copy = buildNotificationCopy("GOAL_FOR_FOLLOWED_TEAM", teams, {
      scoringTeamName: scoringTeam.name,
      minute: event.minute,
    });

    for (const userId of allowed) {
      items.push({
        userId,
        kind: "GOAL_FOR_FOLLOWED_TEAM",
        title: copy.title,
        body: copy.body,
        fixtureId: context.fixtureId,
        teamId: scoringTeam.id,
        dedupeKey: buildNotificationDedupeKey("GOAL_FOR_FOLLOWED_TEAM", [
          dedupeSuffix,
        ]),
        payload: fixtureLinkPayload(context.fixtureProviderId, {
          teamProviderId: scoringTeam.providerId,
          minute: event.minute,
        }),
        skipPreferenceCheck: true,
      });
    }
  }

  const prevStatus = input.prevSnapshot
    ? statusAsFixtureStatus(input.prevSnapshot.status)
    : null;
  const nextStatus = statusAsFixtureStatus(input.nextSnapshot.status);

  if (
    prevStatus &&
    isLiveFixtureStatus(prevStatus) &&
    isFinishedFixtureStatus(nextStatus)
  ) {
    for (const team of [context.homeTeam, context.awayTeam]) {
      const followerIds = await listTeamFollowerUserIds(team.id);
      const allowed = await filterUserIdsByNotificationPreference(
        followerIds,
        "FULL_TIME_FOLLOWED_TEAM"
      );
      const copy = buildNotificationCopy("FULL_TIME_FOLLOWED_TEAM", teams);
      const dedupeKey = buildNotificationDedupeKey("FULL_TIME_FOLLOWED_TEAM", [
        context.fixtureId,
        team.id,
      ]);

      for (const userId of allowed) {
        items.push({
          userId,
          kind: "FULL_TIME_FOLLOWED_TEAM",
          title: copy.title,
          body: copy.body,
          fixtureId: context.fixtureId,
          teamId: team.id,
          dedupeKey,
          payload: fixtureLinkPayload(context.fixtureProviderId, {
            teamProviderId: team.providerId,
            finalStatus: nextStatus,
          }),
          skipPreferenceCheck: true,
        });
      }
    }
  }

  const watchedUserIds = await listWatchedMatchUserIds(
    context.fixtureId,
    context.homeTeam.id,
    context.awayTeam.id
  );

  const hasProbabilityShift = input.pipelineResult.detectResult.events.some(
    (event) => event.kind === "PROBABILITY_SHIFT"
  );

  if (hasProbabilityShift && watchedUserIds.length > 0) {
    const allowed = await filterUserIdsByNotificationPreference(
      watchedUserIds,
      "PREDICTION_SHIFT"
    );
    const copy = buildNotificationCopy("PREDICTION_SHIFT", teams);
    const shiftKey = input.nextSnapshot.capturedAt;

    for (const userId of allowed) {
      items.push({
        userId,
        kind: "PREDICTION_SHIFT",
        title: copy.title,
        body: copy.body,
        fixtureId: context.fixtureId,
        dedupeKey: buildNotificationDedupeKey("PREDICTION_SHIFT", [
          context.fixtureId,
          shiftKey,
        ]),
        payload: fixtureLinkPayload(context.fixtureProviderId),
        skipPreferenceCheck: true,
      });
    }
  }

  if (input.pipelineResult.liveInsightGenerated && watchedUserIds.length > 0) {
    const allowed = await filterUserIdsByNotificationPreference(
      watchedUserIds,
      "AI_INSIGHT_REFRESHED"
    );
    const copy = buildNotificationCopy("AI_INSIGHT_REFRESHED", teams);

    for (const userId of allowed) {
      items.push({
        userId,
        kind: "AI_INSIGHT_REFRESHED",
        title: copy.title,
        body: copy.body,
        fixtureId: context.fixtureId,
        dedupeKey: buildNotificationDedupeKey("AI_INSIGHT_REFRESHED", [
          context.fixtureId,
          input.nextSnapshot.capturedAt,
        ]),
        payload: fixtureLinkPayload(context.fixtureProviderId),
        skipPreferenceCheck: true,
      });
    }
  }

  if (items.length > 0) {
    await enqueueManyNotifications(items);
  }
}
