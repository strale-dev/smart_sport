import { describe, expect, it } from "vitest";

import {
  getMatchOverviewRenderMode,
  getOverviewCardOrder,
  getOverviewLayout,
  isOverviewCardVisible,
} from "@/lib/fixtures/overview-layout";
import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import type { FixtureEvent, FixtureTeamStatistics } from "@/types/domain";

describe("getOverviewLayout", () => {
  it("uses pre layout for upcoming fixtures", () => {
    expect(getOverviewLayout("NS")).toBe("pre");
    expect(getOverviewLayout("TBD")).toBe("pre");
  });

  it("uses live layout for in-progress and finished fixtures", () => {
    expect(getOverviewLayout("1H")).toBe("live");
    expect(getOverviewLayout("FT")).toBe("live");
    expect(getOverviewLayout("PEN")).toBe("live");
  });
});

describe("getMatchOverviewRenderMode", () => {
  it("uses pre for upcoming fixtures", () => {
    expect(getMatchOverviewRenderMode("NS")).toBe("pre");
    expect(getMatchOverviewRenderMode("TBD")).toBe("pre");
  });

  it("uses finished for completed fixtures", () => {
    expect(getMatchOverviewRenderMode("FT")).toBe("finished");
    expect(getMatchOverviewRenderMode("AET")).toBe("finished");
    expect(getMatchOverviewRenderMode("PEN")).toBe("finished");
  });

  it("uses live for in-progress fixtures", () => {
    expect(getMatchOverviewRenderMode("1H")).toBe("live");
    expect(getMatchOverviewRenderMode("2H")).toBe("live");
    expect(getMatchOverviewRenderMode("LIVE")).toBe("live");
  });
});

describe("overview card visibility", () => {
  it("hides timeline and momentum before kickoff", () => {
    expect(isOverviewCardVisible("timeline", "pre")).toBe(false);
    expect(isOverviewCardVisible("momentum", "pre")).toBe(false);
    expect(isOverviewCardVisible("comparison", "pre")).toBe(true);
    expect(isOverviewCardVisible("formPreview", "pre")).toBe(true);
    expect(isOverviewCardVisible("h2hPreview", "pre")).toBe(true);
    expect(isOverviewCardVisible("formPreview", "live")).toBe(false);
    expect(isOverviewCardVisible("h2hPreview", "live")).toBe(false);
  });

  it("orders pre-match overview comparison then form/H2H (PRD §6.4 group)", () => {
    expect(getOverviewCardOrder("pre")).toEqual([
      "comparison",
      "formPreview",
      "h2hPreview",
      "playersToWatch",
      "lineupTeaser",
    ]);
  });

  it("shows lineup teaser in pre and live modes", () => {
    expect(isOverviewCardVisible("lineupTeaser", "pre")).toBe(true);
    expect(isOverviewCardVisible("lineupTeaser", "live")).toBe(true);
  });

  it("orders live/FT overview stats before momentum, timeline after comparison", () => {
    expect(getOverviewCardOrder("live")).toEqual([
      "probabilityDelta",
      "liveStats",
      "momentum",
      "comparison",
      "timeline",
      "playersToWatch",
      "lineupTeaser",
    ]);
  });

  it("shows B1 finished-overview cards when layout is live (FT uses live layout)", () => {
    expect(getOverviewLayout("FT")).toBe("live");
    expect(getMatchOverviewRenderMode("FT")).toBe("finished");
    expect(isOverviewCardVisible("timeline", "live")).toBe(true);
    expect(isOverviewCardVisible("liveStats", "live")).toBe(true);
    expect(isOverviewCardVisible("momentum", "live")).toBe(true);
  });
});

describe("computeMatchMomentum", () => {
  it("builds buckets from events", () => {
    const events: FixtureEvent[] = [
      {
        externalEventId: "1",
        minute: 12,
        extraMinute: null,
        teamExternalId: 1,
        playerExternalId: 10,
        assistPlayerExternalId: null,
        type: "Goal",
        detail: "Normal Goal",
        comments: null,
      },
    ];
    const stats: FixtureTeamStatistics[] = [
      {
        teamExternalId: 1,
        shotsTotal: 6,
        shotsOnTarget: 3,
        shotsOffTarget: null,
        shotsBlocked: null,
        shotsInsideBox: null,
        shotsOutsideBox: null,
        fouls: null,
        corners: null,
        offsides: null,
        ballPossession: null,
        yellowCards: null,
        redCards: null,
        goalkeeperSaves: null,
        totalPasses: null,
        passesAccurate: null,
        passesPercent: null,
        expectedGoals: null,
      },
      {
        teamExternalId: 2,
        shotsTotal: 4,
        shotsOnTarget: 1,
        shotsOffTarget: null,
        shotsBlocked: null,
        shotsInsideBox: null,
        shotsOutsideBox: null,
        fouls: null,
        corners: null,
        offsides: null,
        ballPossession: null,
        yellowCards: null,
        redCards: null,
        goalkeeperSaves: null,
        totalPasses: null,
        passesAccurate: null,
        passesPercent: null,
        expectedGoals: null,
      },
    ];

    const buckets = computeMatchMomentum(events, stats, 90);
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.some((bucket) => bucket.homeIntensity > 0)).toBe(true);
  });
});
