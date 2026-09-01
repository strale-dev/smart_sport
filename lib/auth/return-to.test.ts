import { describe, expect, it } from "vitest";

import { DEFAULT_RETURN_TO, loginHref, safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("defaults to home when missing", () => {
    expect(safeReturnTo(undefined)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo(null)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("")).toBe(DEFAULT_RETURN_TO);
  });

  it("allows same-origin relative paths", () => {
    expect(safeReturnTo("/dashboard")).toBe("/dashboard");
    expect(safeReturnTo("/matches/123?tab=lineups")).toBe(
      "/matches/123?tab=lineups"
    );
  });

  it("rejects protocol-relative and external URLs", () => {
    expect(safeReturnTo("//evil.example")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("/\\evil.example")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("https://evil.example")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("http://evil.example/phish")).toBe(DEFAULT_RETURN_TO);
  });

  it("rejects encoded open redirects", () => {
    expect(safeReturnTo("%2F%2Fevil.example")).toBe(DEFAULT_RETURN_TO);
  });

  it("rejects auth pages", () => {
    expect(safeReturnTo("/login")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("/signup")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("/reset-password")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("/update-password")).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo("/login?foo=1")).toBe(DEFAULT_RETURN_TO);
  });

  it("allows update-password when opted in", () => {
    expect(
      safeReturnTo("/update-password", { allowUpdatePassword: true })
    ).toBe("/update-password");
  });
});

describe("loginHref", () => {
  it("omits returnTo when destination is home", () => {
    expect(loginHref("/")).toBe("/login");
    expect(loginHref()).toBe("/login");
  });

  it("encodes a safe returnTo", () => {
    expect(loginHref("/dashboard")).toBe("/login?returnTo=%2Fdashboard");
  });
});
