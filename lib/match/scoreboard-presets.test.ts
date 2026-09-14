import { describe, expect, it } from "vitest";

import { getMatchScoreboardPreset } from "@/lib/match/scoreboard-presets";

describe("getMatchScoreboardPreset", () => {
  it("row preset stays compact for list surfaces", () => {
    const preset = getMatchScoreboardPreset("row");
    expect(preset.linkTeams).toBe(false);
    expect(preset.scoreClassName).toBe("text-lg");
    expect(preset.logoPriority).toBe(false);
    expect(preset.truncateTeamNames).toBe(true);
  });

  it("header preset matches match page hero scoreboard", () => {
    const preset = getMatchScoreboardPreset("header");
    expect(preset.linkTeams).toBe(true);
    expect(preset.showHalftimeLine).toBe(true);
    expect(preset.logoPriority).toBe(true);
    expect(preset.scoreClassName).toContain("text-2xl");
    expect(preset.logoClassName).toContain("size-10");
  });
});
