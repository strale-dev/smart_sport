import { describe, expect, it } from "vitest";

import {
  evaluateTeamHistoryCompleteness,
  evaluateTeamHistoryDataState,
  TEAM_HISTORY_MIN_MATCHES,
  TEAM_HISTORY_PARTIAL_THRESHOLD,
} from "@/lib/analytics/team-history-query";

describe("team history completeness", () => {
  it("marks DATA_COMPLETE at 30+ matches", () => {
    expect(evaluateTeamHistoryDataState(TEAM_HISTORY_MIN_MATCHES)).toBe(
      "DATA_COMPLETE"
    );
    expect(evaluateTeamHistoryDataState(100)).toBe("DATA_COMPLETE");
  });

  it("marks DATA_PARTIAL between partial threshold and min", () => {
    expect(evaluateTeamHistoryDataState(TEAM_HISTORY_PARTIAL_THRESHOLD)).toBe(
      "DATA_PARTIAL"
    );
    expect(evaluateTeamHistoryDataState(29)).toBe("DATA_PARTIAL");
  });

  it("marks DATA_INSUFFICIENT below partial threshold", () => {
    expect(evaluateTeamHistoryDataState(9)).toBe("DATA_INSUFFICIENT");
    expect(evaluateTeamHistoryDataState(5)).toBe("DATA_INSUFFICIENT");
    expect(evaluateTeamHistoryDataState(0)).toBe("DATA_INSUFFICIENT");
  });

  it("does not treat 5 matches as equivalent to 30", () => {
    const five = evaluateTeamHistoryCompleteness(5, "ALL");
    const thirty = evaluateTeamHistoryCompleteness(30, "ALL");
    expect(five.state).toBe("DATA_INSUFFICIENT");
    expect(thirty.state).toBe("DATA_COMPLETE");
    expect(five.state).not.toBe(thirty.state);
  });
});

describe("team history row ordering (logic)", () => {
  it("excludes fixtures at or after as-of when filtering client-side", () => {
    const beforeAt = "2026-03-15T15:00:00.000Z";
    const rows = [
      { kickoff_at: "2026-03-14T12:00:00.000Z" },
      { kickoff_at: "2026-03-15T15:00:00.000Z" },
      { kickoff_at: "2026-03-16T12:00:00.000Z" },
    ];
    const filtered = rows.filter((row) => row.kickoff_at < beforeAt);
    expect(filtered).toHaveLength(1);
  });
});
