import { describe, expect, it } from "vitest";

import {
  dateScanEndExclusive,
  initialDateScanCursor,
  parseSyncFixturesFutureCheckpoint,
  resolveDateScanStart,
} from "@/lib/ingestion/sync-fixtures-future-cursor";

describe("sync-fixtures-future cursor", () => {
  const today = "2026-10-07";
  const horizonDays = 3;

  it("invalidates checkpoint when anchor or horizon drifts", () => {
    expect(
      parseSyncFixturesFutureCheckpoint(
        {
          phase: "date_scan",
          nextUtcDate: "2026-10-08",
          anchorUtcDate: "2026-10-06",
          horizonDays: 3,
        },
        today,
        horizonDays
      )
    ).toBeNull();
  });

  it("resumes date scan from stored nextUtcDate", () => {
    const checkpoint = parseSyncFixturesFutureCheckpoint(
      {
        phase: "date_scan",
        nextUtcDate: "2026-10-09",
        anchorUtcDate: today,
        horizonDays,
      },
      today,
      horizonDays
    );

    expect(checkpoint?.phase).toBe("date_scan");
    const resolved = resolveDateScanStart(checkpoint, today, horizonDays);
    expect(resolved.phase).toBe("date_scan");
    expect(resolved.startUtcDate).toBe("2026-10-09");
  });

  it("starts league season phase when date scan cursor is past horizon", () => {
    const end = dateScanEndExclusive(today, horizonDays);
    const resolved = resolveDateScanStart(
      {
        phase: "date_scan",
        nextUtcDate: end,
        anchorUtcDate: today,
        horizonDays,
      },
      today,
      horizonDays
    );
    expect(resolved.phase).toBe("league_season");
    expect(resolved.startUtcDate).toBeNull();
  });

  it("initialDateScanCursor starts at today", () => {
    expect(initialDateScanCursor(today, horizonDays).nextUtcDate).toBe(today);
  });

  it("resumes league season from nextIndex", () => {
    const checkpoint = parseSyncFixturesFutureCheckpoint(
      {
        phase: "league_season",
        leagueProviderIds: [39, 140],
        nextIndex: 1,
        anchorUtcDate: today,
        horizonDays,
      },
      today,
      horizonDays
    );

    const resolved = resolveDateScanStart(checkpoint, today, horizonDays);
    expect(resolved.phase).toBe("league_season");
    expect(resolved.leagueSeasonIndex).toBe(1);
    expect(resolved.leagueProviderIds).toEqual([39, 140]);
  });
});
