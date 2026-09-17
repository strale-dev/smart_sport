import { describe, expect, it } from "vitest";

import {
  buildNotificationDedupeKey,
  dedupeKeyFromPayload,
  withDedupePayload,
} from "@/lib/notifications/dedupe";

describe("notification dedupe", () => {
  it("builds stable dedupe keys", () => {
    expect(
      buildNotificationDedupeKey("GOAL_FOR_FOLLOWED_TEAM", [
        "fixture-uuid",
        "evt-1",
      ])
    ).toBe("GOAL_FOR_FOLLOWED_TEAM:fixture-uuid:evt-1");
  });

  it("merges dedupeKey into payload", () => {
    expect(withDedupePayload({ fixtureProviderId: 1 }, "GOAL:abc")).toEqual({
      fixtureProviderId: 1,
      dedupeKey: "GOAL:abc",
    });
  });

  it("reads dedupeKey from payload", () => {
    expect(dedupeKeyFromPayload({ dedupeKey: "x" })).toBe("x");
    expect(dedupeKeyFromPayload({})).toBeNull();
    expect(dedupeKeyFromPayload(null)).toBeNull();
  });
});
