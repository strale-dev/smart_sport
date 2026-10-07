import { describe, expect, it } from "vitest";

import {
  H2H_EFFECTIVE_MEETING_CAP,
  type FixtureH2HFeatures,
} from "@/lib/analytics/history-feature-types";
import {
  normalizeWeights,
  weightForKickoff,
} from "@/lib/analytics/recency-weight";

describe("fixture-h2h recency cap", () => {
  it("caps total H2H influence at effective meeting cap", () => {
    const beforeAt = "2026-06-01T12:00:00.000Z";
    const weights = [1, 0.8, 0.5, 0.3, 0.1, 0.05].map((_, i) =>
      weightForKickoff({
        kickoffAt: `2026-0${5 - Math.min(i, 4)}-15T12:00:00.000Z`,
        beforeAt,
        halfLifeDays: 21,
      })
    );
    const capped = normalizeWeights(weights, H2H_EFFECTIVE_MEETING_CAP);
    const total = capped.reduce((s, w) => s + w, 0);
    expect(total).toBeLessThanOrEqual(H2H_EFFECTIVE_MEETING_CAP + 0.001);
  });

  it("H2H feature type is separate from team history", () => {
    const h2h: FixtureH2HFeatures = {
      beforeAt: "2026-01-01T00:00:00.000Z",
      homeTeamProviderId: 1,
      awayTeamProviderId: 2,
      scope: "ALL",
      meetingsTotal: 0,
      meetingsInWindow: 0,
      effectiveMeetingWeight: 0,
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      recencyWeightedHomeWinRate: {
        status: "unavailable",
        value: null,
        sampleSize: 0,
      },
      recencyWeightedAvgGoals: {
        status: "unavailable",
        value: null,
        sampleSize: 0,
      },
      avgGoalsSimple: {
        status: "unavailable",
        value: null,
        sampleSize: 0,
      },
      venueHomeWinRateAtHome: {
        status: "unavailable",
        value: null,
        sampleSize: 0,
      },
      dataState: "unavailable",
    };
    expect(h2h.meetingsInWindow).toBe(0);
  });
});
