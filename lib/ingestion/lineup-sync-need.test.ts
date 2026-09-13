import { describe, expect, it } from "vitest";

import {
  evaluateLineupSyncNeed,
  LINEUP_SYNC_COMPLETE_STARTERS,
  type LineupSyncDbSnapshot,
} from "@/lib/ingestion/match-details-upsert";

const completeSnapshot: LineupSyncDbSnapshot = {
  teams: [
    { startingCount: LINEUP_SYNC_COMPLETE_STARTERS },
    { startingCount: LINEUP_SYNC_COMPLETE_STARTERS },
  ],
};

describe("evaluateLineupSyncNeed", () => {
  const kickoff = new Date("2026-09-13T15:00:00.000Z");

  it("syncs when there are no lineups in the database", () => {
    expect(
      evaluateLineupSyncNeed(
        { teams: [] },
        kickoff,
        new Date("2026-09-13T13:00:00.000Z")
      )
    ).toBe(true);
  });

  it("syncs when lineups are incomplete", () => {
    expect(
      evaluateLineupSyncNeed(
        { teams: [{ startingCount: 5 }, { startingCount: 11 }] },
        kickoff,
        new Date("2026-09-13T13:00:00.000Z")
      )
    ).toBe(true);
  });

  it("skips when both teams are complete and kickoff is more than 60 minutes away", () => {
    expect(
      evaluateLineupSyncNeed(
        completeSnapshot,
        kickoff,
        new Date("2026-09-13T13:45:00.000Z")
      )
    ).toBe(false);
  });

  it("syncs when both teams are complete but kickoff is within 60 minutes", () => {
    expect(
      evaluateLineupSyncNeed(
        completeSnapshot,
        kickoff,
        new Date("2026-09-13T14:30:00.000Z")
      )
    ).toBe(true);
  });
});
