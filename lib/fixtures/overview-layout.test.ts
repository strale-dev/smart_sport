import { describe, expect, it } from "vitest";

import {
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

describe("overview card visibility", () => {
  it("hides timeline and momentum before kickoff", () => {
    expect(isOverviewCardVisible("timeline", "pre")).toBe(false);
    expect(isOverviewCardVisible("momentum", "pre")).toBe(false);
    expect(isOverviewCardVisible("comparison", "pre")).toBe(true);
  });

  it("prioritizes timeline and momentum after kickoff", () => {
    expect(getOverviewCardOrder("live")[0]).toBe("timeline");
    expect(getOverviewCardOrder("live")[1]).toBe("momentum");
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
