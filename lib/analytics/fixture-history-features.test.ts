import { describe, expect, it } from "vitest";

describe("fixture-history PIT filter", () => {
  it("excludes fixtures at or after beforeAt", () => {
    const beforeAt = "2026-03-15T15:00:00.000Z";
    const kickoffs = [
      "2026-03-14T12:00:00.000Z",
      "2026-03-15T15:00:00.000Z",
      "2026-03-16T12:00:00.000Z",
    ];
    const eligible = kickoffs.filter((k) => k < beforeAt);
    expect(eligible).toEqual(["2026-03-14T12:00:00.000Z"]);
  });
});
