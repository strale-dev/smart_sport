import { describe, expect, it } from "vitest";

import {
  isAuthPagePath,
  isAuthRequiredPath,
  isGuestOkPath,
  isUpdatePasswordPath,
} from "./routes";

describe("auth route matchers", () => {
  it("requires auth for dashboard, live, predictions, profile, and favorites", () => {
    expect(isAuthRequiredPath("/dashboard")).toBe(true);
    expect(isAuthRequiredPath("/dashboard/settings")).toBe(true);
    expect(isAuthRequiredPath("/live")).toBe(true);
    expect(isAuthRequiredPath("/predictions")).toBe(true);
    expect(isAuthRequiredPath("/profile")).toBe(true);
    expect(isAuthRequiredPath("/profile/preferences")).toBe(true);
    expect(isAuthRequiredPath("/favorites")).toBe(true);
  });

  it("treats fixtures, match, team, player, and league pages as guest-ok", () => {
    expect(isGuestOkPath("/fixtures")).toBe(true);
    expect(isGuestOkPath("/matches/123")).toBe(true);
    expect(isGuestOkPath("/teams/456")).toBe(true);
    expect(isGuestOkPath("/players/789")).toBe(true);
    expect(isGuestOkPath("/leagues/1")).toBe(true);
    expect(isAuthRequiredPath("/matches/123")).toBe(false);
    expect(isAuthRequiredPath("/fixtures")).toBe(false);
  });

  it("recognizes auth pages but not update-password as a bounce target", () => {
    expect(isAuthPagePath("/login")).toBe(true);
    expect(isAuthPagePath("/signup")).toBe(true);
    expect(isAuthPagePath("/reset-password")).toBe(true);
    expect(isAuthPagePath("/update-password")).toBe(false);
    expect(isUpdatePasswordPath("/update-password")).toBe(true);
  });

  it("does not treat marketing or API routes as protected", () => {
    expect(isAuthRequiredPath("/")).toBe(false);
    expect(isAuthRequiredPath("/privacy")).toBe(false);
    expect(isAuthRequiredPath("/api/auth/callback")).toBe(false);
  });
});
