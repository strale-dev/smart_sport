import { describe, expect, it } from "vitest";

import {
  assertOverviewHasDbData,
  overviewHasRenderableMatchData,
  shouldReuseLiveOverviewSnapshot,
} from "@/lib/match/overview-panel-invariants";

describe("shouldReuseLiveOverviewSnapshot", () => {
  it("reuses when live mode and snapshot present", () => {
    expect(
      shouldReuseLiveOverviewSnapshot("live", {
        fixture: { externalId: 1 } as never,
        events: [],
        statistics: [],
      })
    ).toBe(true);
  });

  it("does not reuse for finished or pre", () => {
    expect(shouldReuseLiveOverviewSnapshot("finished", {} as never)).toBe(
      false
    );
    expect(shouldReuseLiveOverviewSnapshot("pre", {} as never)).toBe(false);
  });

  it("does not reuse when snapshot missing", () => {
    expect(shouldReuseLiveOverviewSnapshot("live", undefined)).toBe(false);
    expect(shouldReuseLiveOverviewSnapshot("live", null)).toBe(false);
  });
});

describe("overviewHasRenderableMatchData", () => {
  it("requires stats or events for finished and live", () => {
    expect(
      overviewHasRenderableMatchData({
        renderMode: "finished",
        events: [],
        statistics: [],
      })
    ).toBe(false);
    expect(
      overviewHasRenderableMatchData({
        renderMode: "finished",
        events: [{ externalEventId: "1" } as never],
        statistics: [],
      })
    ).toBe(true);
  });

  it("always true for prematch", () => {
    expect(
      overviewHasRenderableMatchData({
        renderMode: "pre",
        events: [],
        statistics: [],
      })
    ).toBe(true);
  });
});

describe("assertOverviewHasDbData", () => {
  it("throws when finished overview has no data", () => {
    expect(() =>
      assertOverviewHasDbData({
        renderMode: "finished",
        events: [],
        statistics: [],
        fixtureLabel: "FT#1",
      })
    ).toThrow(/FT#1/);
  });
});
