import { describe, expect, it } from "vitest";

import { getPlayerAttributeMetrics } from "@/lib/players/attributes";
import type { PlayerSeasonStatistics } from "@/types/domain";

const baseStats: PlayerSeasonStatistics = {
  leagueExternalId: 39,
  leagueName: "Premier League",
  seasonYear: 2025,
  team: {
    externalId: 33,
    name: "Manchester United",
    code: "MUN",
    logoUrl: null,
    isNational: false,
  },
  appearances: 20,
  lineups: 18,
  minutes: 1600,
  averageRating: 7.2,
  goals: 8,
  assists: 5,
  saves: null,
  shotsTotal: 40,
  shotsOnTarget: 18,
  passesTotal: 900,
  passesAccuracy: 84,
  keyPasses: 32,
  tacklesTotal: 25,
  interceptions: 12,
  blocks: 4,
  dribblesAttempted: 40,
  dribblesSuccess: 24,
  foulsCommitted: 10,
  foulsDrawn: 15,
  yellowCards: 3,
  redCards: 0,
  penaltiesScored: 1,
  penaltiesMissed: 0,
  goalsConceded: null,
};

describe("getPlayerAttributeMetrics", () => {
  it("returns forward-focused metrics for FW", () => {
    const metrics = getPlayerAttributeMetrics(baseStats, "FW");
    expect(metrics.map((metric) => metric.label)).toEqual([
      "Goals",
      "Assists",
      "Shots on target",
      "Dribble success %",
    ]);
    expect(
      metrics.find((metric) => metric.key === "dribbleSuccessRate")?.value
    ).toBe(60);
  });

  it("returns goalkeeper metrics for GK", () => {
    const metrics = getPlayerAttributeMetrics(
      {
        ...baseStats,
        saves: 55,
        goalsConceded: 18,
        goals: null,
        assists: null,
      },
      "GK"
    );

    expect(metrics.map((metric) => metric.label)).toEqual([
      "Saves",
      "Goals conceded",
      "Avg rating",
      "Appearances",
    ]);
  });

  it("filters null values and falls back when role metrics are empty", () => {
    const metrics = getPlayerAttributeMetrics(
      {
        ...baseStats,
        keyPasses: null,
        assists: null,
        passesAccuracy: null,
        dribblesAttempted: null,
        dribblesSuccess: null,
      },
      "MF"
    );

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.some((metric) => metric.label === "Goals")).toBe(true);
  });
});
