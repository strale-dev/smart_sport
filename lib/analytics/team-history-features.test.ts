import { describe, expect, it } from "vitest";

import {
  formResultsForScope,
  scopeFilterRows,
} from "@/lib/analytics/team-history-context";
import type { TeamFixtureRow } from "@/lib/analytics/compute-form";

function row(
  homeId: number,
  awayId: number,
  providerId: number
): TeamFixtureRow {
  return {
    provider_id: providerId,
    kickoff_at: "2026-03-01T12:00:00.000Z",
    score_home: 2,
    score_away: 1,
    home_team: { provider_id: homeId, name: "Home" },
    away_team: { provider_id: awayId, name: "Away" },
    league: { provider_id: 1, name: "League" },
  };
}

describe("team history scope isolation", () => {
  const teamA = 10;
  const teamB = 20;
  const rows = [row(teamA, teamB, 1), row(teamB, teamA, 2), row(teamA, 99, 3)];

  it("HOME scope only includes home fixtures for team", () => {
    const home = scopeFilterRows(rows, teamA, "HOME");
    expect(home).toHaveLength(2);
    expect(home.every((r) => r.home_team?.provider_id === teamA)).toBe(true);
  });

  it("form results only from team participant rows", () => {
    const results = formResultsForScope(rows, teamA, "ALL", 10);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.goalsFor >= 0)).toBe(true);
  });

  it("does not mix team B into team A metrics", () => {
    const resultsA = formResultsForScope(rows, teamA, "ALL", 10);
    const resultsB = formResultsForScope(rows, teamB, "ALL", 10);
    expect(resultsA.length).not.toBe(resultsB.length);
  });
});
