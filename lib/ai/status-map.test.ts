import { describe, expect, it } from "vitest";

import {
  canGeneratePrematchInsight,
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
    }
  });

  it("maps finished statuses", () => {
    for (const status of ["FT", "AET", "PEN"]) {
      expect(resolveFixturePhase(status)).toBe("FINISHED");
      expect(isHistoricalInsightOnly(status)).toBe(true);
    }
  });

  it("maps neither statuses", () => {
    for (const status of ["PST", "CANC", "ABD", "AWD", "WO"]) {
      expect(resolveFixturePhase(status)).toBe("NEITHER");
      expect(isFixtureAnalyzable(status)).toBe(false);
    }
  });
});
