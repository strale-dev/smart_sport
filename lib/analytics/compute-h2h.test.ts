import { describe, expect, it } from "vitest";

import type { TeamFixtureRow } from "@/lib/analytics/compute-form";
import {
  canonicalTeamPair,
  summarizeH2HMeetings,
} from "@/lib/analytics/compute-h2h";

function makeRow(
  overrides: Partial<TeamFixtureRow> & {
    homeProviderId?: number;
    awayProviderId?: number;
    homeName?: string;
    awayName?: string;
  } = {}
): TeamFixtureRow {
  const {
    homeProviderId = 100,
    awayProviderId = 200,
    homeName = "Home FC",
    awayName = "Away FC",
    ...rest
  } = overrides;

  return {
    provider_id: 1,
    kickoff_at: "2026-09-01T15:00:00.000Z",
    score_home: 2,
    score_away: 1,
    home_team: { provider_id: homeProviderId, name: homeName },
    away_team: { provider_id: awayProviderId, name: awayName },
    league: { provider_id: 39, name: "Premier League" },
    ...rest,
  };
}

describe("canonicalTeamPair", () => {
  it("orders UUIDs lexicographically", () => {
    expect(canonicalTeamPair("b-uuid", "a-uuid")).toEqual(["a-uuid", "b-uuid"]);
    expect(canonicalTeamPair("a-uuid", "b-uuid")).toEqual(["a-uuid", "b-uuid"]);
  });
});

describe("summarizeH2HMeetings", () => {
  it("counts wins by provider id when team A is home", () => {
    const summary = summarizeH2HMeetings(
      [makeRow({ provider_id: 10, score_home: 2, score_away: 0 })],
      100,
      200,
      10,
      "ALL"
    );

    expect(summary.teamAWins).toBe(1);
    expect(summary.teamBWins).toBe(0);
    expect(summary.draws).toBe(0);
    expect(summary.teamAGoals).toBe(2);
    expect(summary.teamBGoals).toBe(0);
    expect(summary.meetings).toHaveLength(1);
    expect(summary.meetings[0]?.homeTeamName).toBe("Home FC");
  });

  it("counts wins by provider id when team A is away", () => {
    const summary = summarizeH2HMeetings(
      [
        makeRow({
          provider_id: 11,
          homeProviderId: 200,
          awayProviderId: 100,
          homeName: "Away FC",
          awayName: "Home FC",
          score_home: 0,
          score_away: 3,
        }),
      ],
      100,
      200,
      10,
      "ALL"
    );

    expect(summary.teamAWins).toBe(1);
    expect(summary.teamBWins).toBe(0);
    expect(summary.teamAGoals).toBe(3);
    expect(summary.teamBGoals).toBe(0);
  });

  it("records draws and ignores null scores in aggregates", () => {
    const summary = summarizeH2HMeetings(
      [
        makeRow({ provider_id: 12, score_home: 1, score_away: 1 }),
        makeRow({
          provider_id: 13,
          score_home: null,
          score_away: null,
        }),
      ],
      100,
      200,
      10,
      "ALL"
    );

    expect(summary.teamAWins).toBe(0);
    expect(summary.teamBWins).toBe(0);
    expect(summary.draws).toBe(1);
    expect(summary.teamAGoals).toBe(1);
    expect(summary.teamBGoals).toBe(1);
    expect(summary.meetings).toHaveLength(2);
    expect(summary.meetings[1]?.homeScore).toBeNull();
  });

  it("preserves scope and window size in the summary", () => {
    const summary = summarizeH2HMeetings([], 100, 200, 5, "SAME_COMP");

    expect(summary.scope).toBe("SAME_COMP");
    expect(summary.windowSize).toBe(5);
    expect(summary.teamAExternalId).toBe(100);
    expect(summary.teamBExternalId).toBe(200);
  });
});
