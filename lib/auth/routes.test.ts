import { describe, expect, it } from "vitest";

import {
  isAuthRequiredPath,
  middlewareNeedsSessionUser,
} from "@/lib/auth/routes";

describe("middlewareNeedsSessionUser", () => {
  it("requires session for auth-gated app routes", () => {
    expect(middlewareNeedsSessionUser("/dashboard")).toBe(true);
    expect(middlewareNeedsSessionUser("/profile/subscription")).toBe(true);
    expect(middlewareNeedsSessionUser("/login")).toBe(true);
    expect(middlewareNeedsSessionUser("/update-password")).toBe(true);
  });

  it("skips session for guest browsing routes", () => {
    expect(middlewareNeedsSessionUser("/")).toBe(false);
    expect(middlewareNeedsSessionUser("/matches/1570355")).toBe(false);
    expect(middlewareNeedsSessionUser("/live")).toBe(false);
    expect(middlewareNeedsSessionUser("/fixtures")).toBe(false);
    expect(middlewareNeedsSessionUser("/pricing")).toBe(false);
  });

  it("aligns auth-required paths with dashboard gate", () => {
    expect(isAuthRequiredPath("/dashboard")).toBe(true);
    expect(isAuthRequiredPath("/matches/1")).toBe(false);
  });
});
