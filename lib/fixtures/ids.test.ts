import { describe, expect, it } from "vitest";

import {
  daySectionAnchorId,
  parseFixtureId,
  parseProviderId,
} from "@/lib/fixtures/ids";

describe("parseProviderId", () => {
  it("is the shared parser for fixture, team, and player ids", () => {
    expect(parseProviderId("33")).toBe(33);
    expect(parseProviderId).toBe(parseFixtureId);
  });
});

describe("daySectionAnchorId", () => {
  it("builds stable day section ids for scroll anchors", () => {
    expect(daySectionAnchorId("2026-09-03")).toBe("day-2026-09-03");
  });
});

describe("parseFixtureId", () => {
  it("parses valid numeric ids", () => {
    expect(parseFixtureId("1035037")).toBe(1035037);
    expect(parseFixtureId(" 42 ")).toBe(42);
  });

  it("rejects invalid ids", () => {
    expect(parseFixtureId("")).toBeNull();
    expect(parseFixtureId("abc")).toBeNull();
    expect(parseFixtureId("12abc")).toBeNull();
    expect(parseFixtureId("-1")).toBeNull();
    expect(parseFixtureId("0")).toBeNull();
    expect(parseFixtureId("1.5")).toBeNull();
  });
});
