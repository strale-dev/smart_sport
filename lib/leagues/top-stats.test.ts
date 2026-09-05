import { describe, expect, it } from "vitest";

import { buildLeagueStatLeaderboards } from "@/lib/leagues/top-stats";
import type { LeaguePlayerLeaderboardRow } from "@/types/domain";

function makeRow(
  id: number,
  name: string,
  rank: number,
  overrides: Partial<LeaguePlayerLeaderboardRow> = {}
): LeaguePlayerLeaderboardRow {
  return {
    rank,
    player: { externalId: id, fullName: name, photoUrl: null },
    team: {
      externalId: id * 10,
      name: `Team ${id}`,
      code: null,
      logoUrl: null,
      isNational: false,
    },
    goals: null,
    assists: null,
    appearances: 10,
    minutes: 900,
    rating: null,
    shotsTotal: null,
    shotsOnTarget: null,
    keyPasses: null,
    passesTotal: null,
    tacklesTotal: null,
    interceptions: null,
    dribblesSuccess: null,
    yellowCards: null,
    redCards: null,
    saves: null,
    foulsCommitted: null,
    ...overrides,
  };
}

describe("buildLeagueStatLeaderboards", () => {
  it("uses API lists for goals and assists", () => {
    const leaderboards = buildLeagueStatLeaderboards({
      topScorers: [makeRow(1, "Alice", 1, { goals: 20 })],
      topAssists: [makeRow(2, "Bob", 1, { assists: 12 })],
      topYellowCards: [],
      topRedCards: [],
    });

    const goals = leaderboards.find((board) => board.id === "goals");
    const assists = leaderboards.find((board) => board.id === "assists");

    expect(goals?.rows[0]?.player.fullName).toBe("Alice");
    expect(assists?.rows[0]?.player.fullName).toBe("Bob");
  });

  it("derives rating leaderboard from merged player pool", () => {
    const leaderboards = buildLeagueStatLeaderboards({
      topScorers: [makeRow(1, "Alice", 1, { goals: 5, rating: 7.1 })],
      topAssists: [makeRow(2, "Bob", 1, { assists: 4, rating: 7.8 })],
      topYellowCards: [],
      topRedCards: [],
    });

    const rating = leaderboards.find((board) => board.id === "rating");

    expect(rating?.rows[0]?.player.fullName).toBe("Bob");
    expect(rating?.rows[0]?.rating).toBe(7.8);
  });
});
