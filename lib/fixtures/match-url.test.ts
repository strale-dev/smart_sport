import { describe, expect, it } from "vitest";

import { buildMatchHref, parseMatchTab } from "@/lib/fixtures/match-url";

describe("parseMatchTab", () => {
  it("defaults to overview", () => {
    expect(parseMatchTab(undefined)).toBe("overview");
    expect(parseMatchTab("invalid")).toBe("overview");
  });

  it("accepts valid tab values", () => {
    expect(parseMatchTab("ai")).toBe("ai");
    expect(parseMatchTab("lineups")).toBe("lineups");
    expect(parseMatchTab("form")).toBe("form");
  });
});

describe("buildMatchHref", () => {
  it("omits tab query for overview", () => {
    expect(buildMatchHref(1035037)).toBe("/matches/1035037");
    expect(buildMatchHref(1035037, "overview")).toBe("/matches/1035037");
  });

  it("includes tab query for other tabs", () => {
    expect(buildMatchHref(1035037, "lineups")).toBe(
      "/matches/1035037?tab=lineups"
    );
  });
});
