import { describe, expect, it } from "vitest";

import {
  buildCompactPrematchAnalyticsContext,
  estimateCompactContextBytes,
} from "@/lib/analytics/compact-ai-context";
import type { FixtureHistoryFeatures } from "@/lib/analytics/history-feature-types";
import {
  MAX_COMPACT_CONTEXT_BYTES,
  MAX_RECENT_EXAMPLES,
} from "@/lib/analytics/history-feature-types";
import { metricFromValue } from "@/lib/analytics/recency-weight";
import { buildWindowOutcomeMetrics } from "@/lib/analytics/history-window-metrics";
import type { FormMatchResult } from "@/types/domain";

function emptyTeam(providerId: number) {
  const w = buildWindowOutcomeMetrics({
    window: 5,
    scope: "ALL",
    beforeAt: "2026-03-15T15:00:00.000Z",
    results: [] as FormMatchResult[],
    xgByFixtureId: new Map(),
    opponentEloByFixtureId: new Map(),
  });
  return {
    teamProviderId: providerId,
    beforeAt: "2026-03-15T15:00:00.000Z",
    restDays: null,
    completenessByScope: [
      {
        scope: "ALL" as const,
        validCount: 0,
        state: "DATA_INSUFFICIENT" as const,
      },
    ],
    windows: { ALL: { 5: w } },
    periodCompare: [],
    recentExamples: [],
    formSummaryLast5: null,
  };
}

describe("compact-ai-context", () => {
  it("stays within byte budget for minimal fixture features", () => {
    const features: FixtureHistoryFeatures = {
      fixtureExternalId: 1,
      beforeAt: "2026-03-15T15:00:00.000Z",
      leagueProviderId: 39,
      home: emptyTeam(10),
      away: emptyTeam(20),
      h2h: {
        beforeAt: "2026-03-15T15:00:00.000Z",
        homeTeamProviderId: 10,
        awayTeamProviderId: 20,
        scope: "ALL",
        meetingsTotal: 0,
        meetingsInWindow: 0,
        effectiveMeetingWeight: 0,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        recencyWeightedHomeWinRate: metricFromValue(null, 0),
        recencyWeightedAvgGoals: metricFromValue(null, 0),
        avgGoalsSimple: metricFromValue(null, 0),
        venueHomeWinRateAtHome: metricFromValue(null, 0),
        dataState: "unavailable",
      },
    };
    const compact = buildCompactPrematchAnalyticsContext(features);
    expect(compact.home.recentExamples.length).toBeLessThanOrEqual(
      MAX_RECENT_EXAMPLES
    );
    expect(estimateCompactContextBytes(compact)).toBeLessThan(
      MAX_COMPACT_CONTEXT_BYTES
    );
  });

  it("marks xG unavailable without zero", () => {
    const features: FixtureHistoryFeatures = {
      fixtureExternalId: 1,
      beforeAt: "2026-03-15T15:00:00.000Z",
      leagueProviderId: 39,
      home: emptyTeam(10),
      away: emptyTeam(20),
      h2h: {
        beforeAt: "2026-03-15T15:00:00.000Z",
        homeTeamProviderId: 10,
        awayTeamProviderId: 20,
        scope: "ALL",
        meetingsTotal: 0,
        meetingsInWindow: 0,
        effectiveMeetingWeight: 0,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        recencyWeightedHomeWinRate: metricFromValue(null, 0),
        recencyWeightedAvgGoals: metricFromValue(null, 0),
        avgGoalsSimple: metricFromValue(null, 0),
        venueHomeWinRateAtHome: metricFromValue(null, 0),
        dataState: "unavailable",
      },
    };
    const compact = buildCompactPrematchAnalyticsContext(features);
    expect(compact.home.trends.last5?.xgFor.status).toBe("unavailable");
    expect(compact.home.trends.last5?.xgFor.value).toBeNull();
    expect(compact.home.homeAwaySplit.homeXgAgainst5.status).toBe(
      "unavailable"
    );
    expect(compact.home.homeAwaySplit.homeXgAgainst5.value).toBeNull();
  });
});
