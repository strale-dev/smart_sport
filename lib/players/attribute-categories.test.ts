import { describe, expect, it } from "vitest";

import { getPlayerAttributeCategories } from "@/lib/players/attribute-categories";
import type { PlayerSeasonStatistics } from "@/types/domain";

const baseStats = (): PlayerSeasonStatistics => ({
  leagueExternalId: 39,
  leagueName: "Premier League",
  seasonYear: 2025,
  team: {
    externalId: 33,
    name: "Manchester United",
    logoUrl: null,
    code: "MUN",
    isNational: false,
  },
  appearances: 20,
  lineups: 18,
  minutes: 1600,
  averageRating: 7.2,
  goals: 10,
  assists: 5,
  saves: null,
  shotsTotal: 55,
  shotsOnTarget: 28,
  passesTotal: 800,
  passesAccuracy: 82,
  keyPasses: 30,
  tacklesTotal: 20,
  interceptions: 10,
  blocks: 4,
  dribblesAttempted: 40,
  dribblesSuccess: 22,
  goalsConceded: null,
  yellowCards: 3,
  redCards: 0,
  foulsCommitted: 8,
  foulsDrawn: 12,
  penaltiesScored: 1,
  penaltiesMissed: 0,
});

describe("getPlayerAttributeCategories", () => {
  it("returns forward categories with bounded scores", () => {
    const categories = getPlayerAttributeCategories(baseStats(), "FW");
    expect(categories.length).toBeGreaterThanOrEqual(3);
    for (const entry of categories) {
      expect(entry.value).toBeGreaterThanOrEqual(0);
      expect(entry.value).toBeLessThanOrEqual(100);
    }
  });

  it("returns goalkeeper categories when position is GK", () => {
    const stats = {
      ...baseStats(),
      saves: 90,
      goalsConceded: 20,
      goals: 0,
      assists: 1,
    };
    const categories = getPlayerAttributeCategories(stats, "GK");
    expect(categories.some((c) => c.key === "shot_stopping")).toBe(true);
  });
});
