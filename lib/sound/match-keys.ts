import type { MeaningfulEventBroadcastPayload } from "@/lib/live/event-detector-types";
import type { FixtureStatus } from "@/types/domain";
import { isFinishedFixtureStatus, isLiveFixtureStatus } from "@/lib/redis/keys";

export function buildMatchGoalDedupeKey(
  fixtureProviderId: number,
  event: MeaningfulEventBroadcastPayload
): string {
  const suffix =
    event.externalEventId ??
    `${event.minute ?? "na"}:${event.teamExternalId ?? "na"}`;
  return `goal:match:${fixtureProviderId}:${suffix}`;
}

export function buildMatchFullTimeDedupeKey(fixtureProviderId: number): string {
  return `ft:match:${fixtureProviderId}`;
}

export function buildNotificationSoundDedupeKey(
  kind: "goal" | "fullTime",
  notificationId: string
): string {
  return `${kind}:notif:${notificationId}`;
}

export function didTransitionLiveToFinished(
  prevStatus: FixtureStatus | null,
  nextStatus: FixtureStatus
): boolean {
  if (!prevStatus) {
    return false;
  }
  return isLiveFixtureStatus(prevStatus) && isFinishedFixtureStatus(nextStatus);
}
