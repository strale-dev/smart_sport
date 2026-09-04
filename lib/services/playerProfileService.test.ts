import { describe, expect, it } from "vitest";

import {
  emptyPlayerMatchHistoryPage,
  pickPrimarySeasonStatistics,
} from "@/lib/services/playerProfileService";
import type { Player, PlayerSeasonStatistics } from "@/types/domain";

const player: Player = {
  externalId: 909,
  firstName: "Bruno",
  lastName: "Fernandes",
  fullName: "Bruno Fernandes",
  nationality: "Portugal",
  dateOfBirth: "1994-09-08",
  heightCm: 179,
  weightKg: 69,
  position: "MF",
  preferredFoot: "UNKNOWN",
  photoUrl: null,
  currentTeam: {
    externalId: 33,
    name: "Manchester United",
    code: "MUN",
    logoUrl: null,
    isNational: false,
  },
  shirtNumber: 8,
  marketValue: null,
  averageRating: 7.5,
};

function stat(
  overrides: Partial<PlayerSeasonStatistics>
): PlayerSeasonStatistics {
  return {
    leagueExternalId: 39,
    leagueName: "Premier League",
    seasonYear: 2024,
    team: player.currentTeam!,
    appearances: 10,
    lineups: 9,
    minutes: 810,
    averageRating: 7.5,
    goals: 5,
    assists: 4,
    saves: null,
    shotsTotal: 20,
    shotsOnTarget: 8,
    passesTotal: 400,
    passesAccuracy: 82,
    keyPasses: 12,
    tacklesTotal: 15,
    interceptions: 6,
    blocks: 2,
    dribblesAttempted: 10,
    dribblesSuccess: 6,
    foulsCommitted: 8,
    foulsDrawn: 5,
    yellowCards: 2,
    redCards: 0,
    penaltiesScored: 1,
    penaltiesMissed: 0,
    goalsConceded: null,
    ...overrides,
  };
}

describe("pickPrimarySeasonStatistics", () => {
  it("prefers current team and season", () => {
    const stats = [
      stat({
        leagueExternalId: 2,
        leagueName: "Champions League",
        seasonYear: 2023,
      }),
      stat({
        leagueExternalId: 39,
        leagueName: "Premier League",
        seasonYear: 2024,
      }),
    ];

    const primary = pickPrimarySeasonStatistics(stats, player, 2024);

    expect(primary?.leagueExternalId).toBe(39);
    expect(primary?.seasonYear).toBe(2024);
  });

  it("returns null for empty stats", () => {
    expect(pickPrimarySeasonStatistics([], player, 2024)).toBeNull();
  });
});

describe("emptyPlayerMatchHistoryPage", () => {
  it("returns an empty first page", () => {
    expect(emptyPlayerMatchHistoryPage(2, 20)).toEqual({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
      totalPages: 1,
    });
  });
});
