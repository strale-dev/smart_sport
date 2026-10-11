import { describe, expect, it } from "vitest";

import {
  resolveMatchDetailsKickoffCutoff,
  resolveMatchDetailsSyncLookbackHours,
} from "@/lib/ingestion/config";

describe("sync-match-details lookback", () => {
  const nowMs = Date.parse("2026-10-11T12:00:00.000Z");

  it("defaults to 7-day lookback so T-72h kickoffs remain candidates", () => {
    const cutoff = resolveMatchDetailsKickoffCutoff(nowMs);
    const kickoffT72h = new Date(nowMs - 72 * 3_600_000).toISOString();
    expect(kickoffT72h >= cutoff).toBe(true);
    expect(resolveMatchDetailsSyncLookbackHours()).toBe(168);
  });

  it("excludes T-72h kickoffs when lookback is 24 hours", () => {
    const cutoff = resolveMatchDetailsKickoffCutoff(nowMs, {
      MATCH_DETAILS_SYNC_LOOKBACK_HOURS: "24",
    });
    const kickoffT72h = new Date(nowMs - 72 * 3_600_000).toISOString();
    expect(kickoffT72h >= cutoff).toBe(false);
  });
});
