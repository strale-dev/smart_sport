import { describe, expect, it } from "vitest";

import {
  ageFromDateOfBirth,
  formatPlayerFoot,
  formatPlayerPosition,
} from "@/lib/players/display";

describe("formatPlayerPosition", () => {
  it("maps known positions and hides missing ones", () => {
    expect(formatPlayerPosition("FW")).toBe("Forward");
    expect(formatPlayerPosition(null)).toBeNull();
  });
});

describe("formatPlayerFoot", () => {
  it("hides unknown preferred foot", () => {
    expect(formatPlayerFoot("LEFT")).toBe("Left");
    expect(formatPlayerFoot("UNKNOWN")).toBeNull();
  });
});

describe("ageFromDateOfBirth", () => {
  it("computes age in UTC before and after the birthday", () => {
    expect(
      ageFromDateOfBirth("2000-09-03", new Date("2026-09-03T12:00:00Z"))
    ).toBe(26);
    expect(
      ageFromDateOfBirth("2000-09-04", new Date("2026-09-03T12:00:00Z"))
    ).toBe(25);
  });

  it("returns null for missing or invalid dates", () => {
    expect(ageFromDateOfBirth(null)).toBeNull();
    expect(ageFromDateOfBirth("not-a-date")).toBeNull();
  });
});
