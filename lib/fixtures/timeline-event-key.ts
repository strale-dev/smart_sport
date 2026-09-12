import type { FixtureEvent } from "@/types/domain";

export function timelineEventKey(event: FixtureEvent): string {
  if (event.externalEventId) {
    return `ev:${event.externalEventId}`;
  }

  return [
    event.type,
    event.minute,
    event.extraMinute ?? 0,
    event.teamExternalId ?? "",
    event.detail ?? "",
    event.comments ?? "",
  ].join("|");
}
