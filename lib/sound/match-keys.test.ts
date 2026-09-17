import { describe, expect, it } from "vitest";

import {
  buildMatchGoalDedupeKey,
  didTransitionLiveToFinished,
} from "@/lib/sound/match-keys";

describe("match sound keys", () => {
  it("builds goal dedupe key from external event id", () => {
    expect(
      buildMatchGoalDedupeKey(99, {
        kind: "GOAL",
        minute: 12,
        teamExternalId: 1,
        reason: "x",
        externalEventId: "evt-1",
      })
    ).toBe("goal:match:99:evt-1");
  });

  it("detects live to finished transition", () => {
    expect(didTransitionLiveToFinished("LIVE", "FT")).toBe(true);
    expect(didTransitionLiveToFinished("NS", "FT")).toBe(false);
    expect(didTransitionLiveToFinished(null, "FT")).toBe(false);
  });
});
