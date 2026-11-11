import { describe, expect, it } from "vitest";

import {
  assertFixtureSpecificNarrative,
  NarrativeNotFixtureSpecificError,
} from "@/lib/ai/narrative-fixture-specificity";

describe("assertFixtureSpecificNarrative", () => {
  it("rejects generic baseline copy that does not contrast both teams", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary: "Evenly matched sides.",
        commentary: "No clear favorite in this one.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "GENERIC_BASELINE",
      })
    ).toThrow(NarrativeNotFixtureSpecificError);
  });

  it("rejects a summary that names only one team", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary: "Arsenal hold a narrow edge at 62%.",
        commentary: "Arsenal's recent home record supports the model lean.",
        homeTeamAnalysis: "Arsenal scored 8 goals in 5 matches.",
        awayTeamAnalysis: "The visitors conceded 6.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "FIXTURE_SPECIFIC",
      })
    ).toThrow(NarrativeNotFixtureSpecificError);
  });

  it("accepts a summary that contrasts both teams with two numbers", () => {
    expect(() =>
      assertFixtureSpecificNarrative({
        summary:
          "Arsenal (1.8 ppg) are favored over Chelsea (1.1 ppg) in this match.",
        commentary: "Arsenal against Chelsea.",
        homeTeamAnalysis: "Arsenal scored 8 in their last 5.",
        awayTeamAnalysis: "Chelsea conceded 6 in their last 5.",
        homeTeamName: "Arsenal",
        awayTeamName: "Chelsea",
        modelTier: "FIXTURE_SPECIFIC",
      })
    ).not.toThrow();
  });
});
