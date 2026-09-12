import { describe, expect, it } from "vitest";

import { timelineEventKey } from "@/lib/fixtures/timeline-event-key";
import type { FixtureEvent } from "@/types/domain";

function makeEvent(overrides: Partial<FixtureEvent> = {}): FixtureEvent {
  return {
    externalEventId: null,
    minute: 10,
    extraMinute: null,
    teamExternalId: 1,
    playerExternalId: null,
    assistPlayerExternalId: null,
    type: "Goal",
    detail: null,
    comments: null,
    ...overrides,
  };
}

describe("timelineEventKey", () => {
  it("uses externalEventId when present", () => {
    expect(timelineEventKey(makeEvent({ externalEventId: "abc-123" }))).toBe(
      "ev:abc-123"
    );
  });

  it("keeps keys stable when an out-of-order event is inserted", () => {
    const first = makeEvent({
      minute: 12,
      type: "Goal",
      teamExternalId: 10,
    });
    const second = makeEvent({
      minute: 45,
      type: "Card",
      teamExternalId: 11,
    });
    const inserted = makeEvent({
      minute: 30,
      type: "Var",
      teamExternalId: 10,
      detail: "Penalty confirmed",
    });

    const before = [first, second].map(timelineEventKey);
    const after = [first, inserted, second].map(timelineEventKey);

    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(after[1]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
  });
});
