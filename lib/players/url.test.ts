import { describe, expect, it } from "vitest";

import { buildPlayerHref, parsePlayerTab } from "@/lib/players/url";

describe("parsePlayerTab", () => {
  it("defaults to overview", () => {
    expect(parsePlayerTab(undefined)).toBe("overview");
    expect(parsePlayerTab("invalid")).toBe("overview");
  });

  it("accepts valid tab values", () => {
    expect(parsePlayerTab("matches")).toBe("matches");
    expect(parsePlayerTab("statistics")).toBe("statistics");
  });
});

describe("buildPlayerHref", () => {
  it("omits tab query for overview", () => {
    expect(buildPlayerHref(276)).toBe("/players/276");
    expect(buildPlayerHref(276, "overview")).toBe("/players/276");
  });

  it("includes tab query for other tabs", () => {
    expect(buildPlayerHref(276, "matches")).toBe("/players/276?tab=matches");
  });
});
