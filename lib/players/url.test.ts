import { describe, expect, it } from "vitest";

import {
  buildPlayerHref,
  parsePlayerPage,
  parsePlayerTab,
} from "@/lib/players/url";

describe("parsePlayerTab", () => {
  it("defaults to overview", () => {
    expect(parsePlayerTab(undefined)).toBe("overview");
    expect(parsePlayerTab("invalid")).toBe("overview");
  });

  it("accepts valid tab values", () => {
    expect(parsePlayerTab("matches")).toBe("matches");
    expect(parsePlayerTab("statistics")).toBe("statistics");
    expect(parsePlayerTab("career")).toBe("career");
    expect(parsePlayerTab("ai")).toBe("ai");
  });
});

describe("parsePlayerPage", () => {
  it("defaults invalid values to page 1", () => {
    expect(parsePlayerPage(undefined)).toBe(1);
    expect(parsePlayerPage("0")).toBe(1);
    expect(parsePlayerPage("abc")).toBe(1);
  });

  it("parses positive integers", () => {
    expect(parsePlayerPage("2")).toBe(2);
  });
});

describe("buildPlayerHref", () => {
  it("omits query for overview on page 1", () => {
    expect(buildPlayerHref(276)).toBe("/players/276");
    expect(buildPlayerHref(276, { tab: "overview" })).toBe("/players/276");
  });

  it("includes tab and page query params", () => {
    expect(buildPlayerHref(276, { tab: "matches" })).toBe(
      "/players/276?tab=matches"
    );
    expect(buildPlayerHref(276, { tab: "matches", page: 2 })).toBe(
      "/players/276?tab=matches&page=2"
    );
  });
});
