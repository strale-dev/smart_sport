import { describe, expect, it } from "vitest";

import { sortTimelineEventsDesc } from "@/lib/fixtures/sort-timeline-events";
import type { FixtureEvent } from "@/types/domain";

function event(minute: number, extra: number | null = null): FixtureEvent {
  return {
    externalEventId: `${minute}-${extra}`,
    minute,
    extraMinute: extra,
    teamExternalId: 1,
    playerExternalId: null,
    assistPlayerExternalId: null,
    type: "Goal",
    detail: null,
    comments: null,
  };
}

describe("sortTimelineEventsDesc", () => {
  it("orders newest minute first", () => {
    const sorted = sortTimelineEventsDesc([event(10), event(45), event(12)]);
    expect(sorted.map((e) => e.minute)).toEqual([45, 12, 10]);
  });

  it("orders extra time within the same minute", () => {
    const sorted = sortTimelineEventsDesc([
      event(90, 1),
      event(90, 3),
      event(90, 2),
    ]);
    expect(sorted.map((e) => e.extraMinute)).toEqual([3, 2, 1]);
  });
});
