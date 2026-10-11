import { describe, expect, it } from "vitest";

import {
  assertFixtureSpecificNarrative,
  NarrativeNotFixtureSpecificError,
} from "@/lib/ai/narrative-fixture-specificity";

describe("assertFixtureSpecificNarrative", () => {
  it("allows generic baseline tier without team tokens", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary: "Evenly matched sides.",
        commentary: "No clear favorite in this one.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "GENERIC_BASELINE",
      })
    ).not.toThrow();
  });

  it("rejects fixture-specific tier without team references", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary: "Evenly matched sides.",
        commentary: "Both teams enter with similar form.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "FIXTURE_SPECIFIC",
      })
    ).toThrow(NarrativeNotFixtureSpecificError);
  });

  it("accepts when home team name appears in commentary", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary: "Arsenal hold a narrow edge.",
        commentary: "Arsenal's recent home record supports the model lean.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "FIXTURE_SPECIFIC",
      })
    ).not.toThrow();
  });
});
