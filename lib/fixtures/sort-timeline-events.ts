import type { FixtureEvent } from "@/types/domain";

function eventSortKey(event: FixtureEvent): number {
  const extra = event.extraMinute ?? 0;
  return event.minute * 100 + extra;
}

/** Newest events first (descending minute). */
export function sortTimelineEventsDesc(events: FixtureEvent[]): FixtureEvent[] {
  return [...events].sort((a, b) => eventSortKey(b) - eventSortKey(a));
}
