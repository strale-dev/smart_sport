import { describe, expect, it } from "vitest";

import { APP_NAV_ITEMS, isAppNavActive } from "./app-nav";

describe("isAppNavActive", () => {
  it("matches exact and nested paths for nav href", () => {
    const dashboard = APP_NAV_ITEMS[0]!;

    expect(isAppNavActive("/dashboard", dashboard)).toBe(true);
    expect(isAppNavActive("/dashboard/settings", dashboard)).toBe(true);
    expect(isAppNavActive("/live", dashboard)).toBe(false);
  });

  it("highlights Fixtures for match detail routes", () => {
    const fixtures = APP_NAV_ITEMS[1]!;

    expect(isAppNavActive("/fixtures", fixtures)).toBe(true);
    expect(isAppNavActive("/matches/123", fixtures)).toBe(true);
    expect(isAppNavActive("/teams/456", fixtures)).toBe(false);
  });
});
