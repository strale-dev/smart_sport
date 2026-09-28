import { describe, expect, it } from "vitest";

import {
  canBackfillMissingPrematchInsight,
  canGeneratePrematchInsight,
  historicalPrematchWriteAction,
  isFixtureAnalyzable,
  isHistoricalInsightOnly,
  resolveFixturePhase,
} from "@/lib/ai/status-map";

describe("status-map", () => {
  it("maps prematch statuses", () => {
    expect(resolveFixturePhase("NS")).toBe("PREMATCH");
    expect(resolveFixturePhase("TBD")).toBe("PREMATCH");
    expect(canGeneratePrematchInsight("NS")).toBe(true);
    expect(isHistoricalInsightOnly("NS")).toBe(false);
  });

  it("maps live statuses", () => {
    for (const status of [
      "1H",
      "HT",
      "2H",
      "ET",
      "P",
      "BT",
      "LIVE",
      "INT",
      "SUSP",
    ]) {
      expect(resolveFixturePhase(status)).toBe("LIVE");
      expect(isHistoricalInsightOnly(status)).toBe(true);
      expect(canGeneratePrematchInsight(status)).toBe(false);
      expect(canBackfillMissingPrematchInsight(status)).toBe(true);
    }
  });

  it("maps finished statuses", () => {
    for (const status of ["FT", "AET", "PEN"]) {
      expect(resolveFixturePhase(status)).toBe("FINISHED");
      expect(isHistoricalInsightOnly(status)).toBe(true);
      expect(canBackfillMissingPrematchInsight(status)).toBe(true);
      expect(canGeneratePrematchInsight(status)).toBe(false);
    }
  });

  it("maps neither statuses", () => {
    for (const status of ["PST", "CANC", "ABD", "AWD", "WO"]) {
      expect(resolveFixturePhase(status)).toBe("NEITHER");
      expect(isFixtureAnalyzable(status)).toBe(false);
      expect(canBackfillMissingPrematchInsight(status)).toBe(false);
    }
  });

  it("backfills a missing historical insight for signed-in users and cron", () => {
    expect(canBackfillMissingPrematchInsight("NS")).toBe(false);
    expect(
      historicalPrematchWriteAction({
        trigger: "user",
        hasUserId: true,
        hasStoredPrematch: true,
      })
    ).toBe("return_stored");
    expect(
      historicalPrematchWriteAction({
        trigger: "cron",
        hasUserId: false,
        hasStoredPrematch: true,
      })
    ).toBe("return_stored");
    expect(
      historicalPrematchWriteAction({
        trigger: "user",
        hasUserId: true,
        hasStoredPrematch: false,
      })
    ).toBe("backfill");
    expect(
      historicalPrematchWriteAction({
        trigger: "user",
        hasUserId: false,
        hasStoredPrematch: false,
      })
    ).toBe("guest_forbidden");
    expect(
      historicalPrematchWriteAction({
        trigger: "cron",
        hasUserId: false,
        hasStoredPrematch: false,
      })
    ).toBe("backfill");
  });
});
