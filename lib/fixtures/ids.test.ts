import { describe, expect, it } from "vitest";

import { parseFixtureId } from "@/lib/fixtures/ids";

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
