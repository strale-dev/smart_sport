import { describe, expect, it } from "vitest";

import { buildTeamHref, parseTeamTab } from "@/lib/teams/url";

describe("parseTeamTab", () => {
  it("defaults to details", () => {
    expect(parseTeamTab(undefined)).toBe("details");
    expect(parseTeamTab("invalid")).toBe("details");
  });

  it("accepts valid tab values", () => {
    expect(parseTeamTab("matches")).toBe("matches");
    expect(parseTeamTab("standings")).toBe("standings");
    expect(parseTeamTab("squad")).toBe("squad");
    expect(parseTeamTab("statistics")).toBe("statistics");
  });
});

describe("buildTeamHref", () => {
  it("omits tab query for details", () => {
    expect(buildTeamHref(33)).toBe("/teams/33");
    expect(buildTeamHref(33, "details")).toBe("/teams/33");
  });

  it("includes tab query for other tabs", () => {
    expect(buildTeamHref(33, "matches")).toBe("/teams/33?tab=matches");
  });
});
