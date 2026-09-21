import { describe, expect, it } from "vitest";

import {
  buildMatchEmptyContext,
  getFixtureEmptyPhase,
  getMatchEmptyState,
} from "@/lib/match/empty-states";

const baseContext = buildMatchEmptyContext({
  externalId: 1552754,
  status: "NS",
  homeTeam: { externalId: 33, name: "Home FC" },
  awayTeam: { externalId: 34, name: "Away FC" },
  league: { externalId: 39, name: "Premier League" },
});

describe("getFixtureEmptyPhase", () => {
  it("maps fixture status to empty phase", () => {
    expect(getFixtureEmptyPhase("NS")).toBe("pre");
    expect(getFixtureEmptyPhase("1H")).toBe("live");
    expect(getFixtureEmptyPhase("FT")).toBe("finished");
  });
});

describe("getMatchEmptyState", () => {
  it("lineups pre keeps QA title and adds AI CTA", () => {
    const state = getMatchEmptyState("lineups", baseContext);
    expect(state.title).toBe("No lineups available yet");
    expect(state.actions?.[0]?.href).toContain("tab=ai");
  });

  it("standings avoids dev sync copy and links league", () => {
    const state = getMatchEmptyState("standings", baseContext);
    expect(state.description).not.toMatch(/sync|ingested/i);
    expect(state.actions?.[0]?.href).toBe("/leagues/39?tab=standings");
    expect(state.actions?.[1]?.href).toBe("/fixtures?league=39");
  });

  it("standings for unsupported international competitions links matches tab", () => {
    const state = getMatchEmptyState(
      "standings",
      buildMatchEmptyContext({
        externalId: 9001,
        status: "NS",
        homeTeam: { externalId: 1, name: "Serbia", isNational: true },
        awayTeam: { externalId: 2, name: "England", isNational: true },
        league: { externalId: 10, name: "Friendlies" },
      })
    );
    expect(state.title).toContain("not available");
    expect(state.actions?.[0]?.href).toContain("tab=matches");
    expect(state.actions?.[0]?.href).not.toContain("standings");
  });

  it("timeline varies by phase", () => {
    const pre = getMatchEmptyState("timeline", baseContext);
    expect(pre.title).toBe("Kickoff has not started");

    const live = getMatchEmptyState("timeline", {
      ...baseContext,
      status: "2H",
    });
    expect(live.title).toBe("No events yet");
    expect(live.actions?.[0]?.href).toBe("/live");

    const finished = getMatchEmptyState("timeline", {
      ...baseContext,
      status: "FT",
    });
    expect(finished.title).toBe("No event timeline recorded");
  });

  it("formTeam uses team matches link", () => {
    const state = getMatchEmptyState("formTeam", {
      ...baseContext,
      teamName: "Home FC",
      teamExternalId: 33,
    });
    expect(state.title).toContain("Home FC");
    expect(state.actions?.[0]?.href).toBe("/teams/33?tab=matches");
  });

  it("relatedFixtures links fixtures and live", () => {
    const state = getMatchEmptyState("relatedFixtures", baseContext);
    expect(state.actions?.[0]?.href).toBe("/fixtures?league=39");
    expect(state.actions?.[1]?.href).toBe("/live");
  });
});
