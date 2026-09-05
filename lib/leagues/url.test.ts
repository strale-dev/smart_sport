import { describe, expect, it } from "vitest";

import {
  buildLeagueHref,
  parseLeagueSeason,
  parseLeagueTab,
} from "@/lib/leagues/url";

describe("parseLeagueTab", () => {
  it("defaults to overview", () => {
    expect(parseLeagueTab(undefined)).toBe("overview");
    expect(parseLeagueTab("invalid")).toBe("overview");
  });

  it("parses valid tabs", () => {
    expect(parseLeagueTab("standings")).toBe("standings");
    expect(parseLeagueTab("top-scorers")).toBe("top-scorers");
  });
});

describe("parseLeagueSeason", () => {
  it("returns null for invalid values", () => {
    expect(parseLeagueSeason(undefined)).toBeNull();
    expect(parseLeagueSeason("abc")).toBeNull();
    expect(parseLeagueSeason("1800")).toBeNull();
  });

  it("parses valid season years", () => {
    expect(parseLeagueSeason("2025")).toBe(2025);
  });
});

describe("buildLeagueHref", () => {
  it("builds base league href", () => {
    expect(buildLeagueHref(39)).toBe("/leagues/39");
  });

  it("includes season and tab params", () => {
    expect(buildLeagueHref(39, { season: 2025, tab: "standings" })).toBe(
      "/leagues/39?season=2025&tab=standings"
    );
  });

  it("omits overview tab from query", () => {
    expect(buildLeagueHref(39, { season: 2025, tab: "overview" })).toBe(
      "/leagues/39?season=2025"
    );
  });
});
