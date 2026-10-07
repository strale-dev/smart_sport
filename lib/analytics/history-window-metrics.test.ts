import { describe, expect, it } from "vitest";

import { buildWindowOutcomeMetrics } from "@/lib/analytics/history-window-metrics";
import type { FormMatchResult } from "@/types/domain";

function result(
  partial: Partial<FormMatchResult> & Pick<FormMatchResult, "fixtureExternalId">
): FormMatchResult {
  return {
    opponentName: "Opp",
    kickoffAt: "2026-03-01T12:00:00.000Z",
    result: "W",
    goalsFor: 2,
    goalsAgainst: 1,
    isHome: true,
    ...partial,
  };
}

describe("history-window-metrics", () => {
  const beforeAt = "2026-03-15T15:00:00.000Z";

  it("computes BTTS and over 2.5 from scores", () => {
    const results: FormMatchResult[] = [
      result({ fixtureExternalId: 1, goalsFor: 2, goalsAgainst: 1 }),
      result({ fixtureExternalId: 2, goalsFor: 0, goalsAgainst: 0 }),
    ];
    const m = buildWindowOutcomeMetrics({
      window: 5,
      scope: "ALL",
      beforeAt,
      results,
      xgByFixtureId: new Map(),
      opponentEloByFixtureId: new Map(),
    });
    expect(m.bttsRate.status).toBe("available");
    expect(m.bttsRate.value).toBeCloseTo(0.5, 2);
    expect(m.over25Rate.value).toBeCloseTo(0.5, 2);
  });

  it("marks xG unavailable when no paired xG in window", () => {
    const results: FormMatchResult[] = [result({ fixtureExternalId: 1 })];
    const m = buildWindowOutcomeMetrics({
      window: 5,
      scope: "ALL",
      beforeAt,
      results,
      xgByFixtureId: new Map(),
      opponentEloByFixtureId: new Map(),
    });
    expect(m.xgForAvg.status).toBe("unavailable");
    expect(m.xgForAvg.value).toBeNull();
    expect(m.xgAgainstAvg.status).toBe("unavailable");
  });

  it("uses xG only when pair present", () => {
    const results: FormMatchResult[] = [result({ fixtureExternalId: 10 })];
    const xg = new Map([[10, { xgFor: 1.5, xgAgainst: 0.8 }]]);
    const m = buildWindowOutcomeMetrics({
      window: 5,
      scope: "ALL",
      beforeAt,
      results,
      xgByFixtureId: xg,
      opponentEloByFixtureId: new Map(),
    });
    expect(m.xgForAvg.status).toBe("available");
    expect(m.xgForAvg.value).toBeCloseTo(1.5, 2);
  });

  it("does not treat missing window as zero ppg", () => {
    const m = buildWindowOutcomeMetrics({
      window: 5,
      scope: "ALL",
      beforeAt,
      results: [],
      xgByFixtureId: new Map(),
      opponentEloByFixtureId: new Map(),
    });
    expect(m.ppg.status).toBe("unavailable");
    expect(m.ppg.value).toBeNull();
  });
});
