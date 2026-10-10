import type {
  FixtureHistoryFeatures,
  MetricAvailability,
  TeamHistoryFeatures,
} from "@/lib/analytics/history-feature-types";
import {
  MAX_COMPACT_CONTEXT_BYTES,
  MAX_RECENT_EXAMPLES,
} from "@/lib/analytics/history-feature-types";
import type { FixtureH2HFeatures } from "@/lib/analytics/history-feature-types";

export type CompactMetric = {
  status: "available" | "unavailable";
  value: number | null;
  n: number;
};

export type CompactWindowTrend = {
  played: number;
  ppg: CompactMetric;
  goalsForPerGame: CompactMetric;
  goalsAgainstPerGame: CompactMetric;
  bttsRate: CompactMetric;
  over25Rate: CompactMetric;
  xgFor: CompactMetric;
  xgAgainst: CompactMetric;
  recencyPpg: CompactMetric;
  opponentElo: CompactMetric;
};

export type CompactTeamAnalytics = {
  teamProviderId: number;
  restDays: number | null;
  formSummaryLast5: string | null;
  completeness: Array<{ scope: string; state: string; validCount: number }>;
  trends: {
    last5: CompactWindowTrend | null;
    last10: CompactWindowTrend | null;
    last20: CompactWindowTrend | null;
  };
  homeAwaySplit: {
    homeLast5Ppg: CompactMetric;
    awayLast5Ppg: CompactMetric;
    homeXgFor5: CompactMetric;
    awayXgFor5: CompactMetric;
    homeXgAgainst5: CompactMetric;
    awayXgAgainst5: CompactMetric;
  };
  periodCompare: TeamHistoryFeatures["periodCompare"];
  recentExamples: TeamHistoryFeatures["recentExamples"];
};

export type CompactPrematchAnalyticsContext = {
  beforeAt: string;
  home: CompactTeamAnalytics;
  away: CompactTeamAnalytics;
  h2h: {
    meetings: number;
    effectiveWeight: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    recencyHomeWinRate: CompactMetric;
    recencyAvgGoals: CompactMetric;
    scope: FixtureH2HFeatures["scope"];
  } | null;
};

function compactMetric(m: MetricAvailability): CompactMetric {
  return {
    status: m.status,
    value: m.value,
    n: m.sampleSize,
  };
}

function windowTrend(
  team: TeamHistoryFeatures,
  scope: "ALL" | "HOME" | "AWAY",
  window: 5 | 10 | 20
): CompactWindowTrend | null {
  const w = team.windows[scope]?.[window];
  if (!w) {
    return null;
  }
  return {
    played: w.played,
    ppg: compactMetric(w.ppg),
    goalsForPerGame: compactMetric(w.goalsFor),
    goalsAgainstPerGame: compactMetric(w.goalsAgainst),
    bttsRate: compactMetric(w.bttsRate),
    over25Rate: compactMetric(w.over25Rate),
    xgFor: compactMetric(w.xgForAvg),
    xgAgainst: compactMetric(w.xgAgainstAvg),
    recencyPpg: compactMetric(w.recencyWeightedPpg),
    opponentElo: compactMetric(w.opponentStrengthElo),
  };
}

function buildCompactTeam(team: TeamHistoryFeatures): CompactTeamAnalytics {
  const home5 = team.windows.HOME?.[5];
  const away5 = team.windows.AWAY?.[5];

  return {
    teamProviderId: team.teamProviderId,
    restDays: team.restDays,
    formSummaryLast5: team.formSummaryLast5,
    completeness: team.completenessByScope.map((c) => ({
      scope: c.scope,
      state: c.state,
      validCount: c.validCount,
    })),
    trends: {
      last5: windowTrend(team, "ALL", 5),
      last10: windowTrend(team, "ALL", 10),
      last20: windowTrend(team, "ALL", 20),
    },
    homeAwaySplit: {
      homeLast5Ppg: compactMetric(
        home5?.ppg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
      awayLast5Ppg: compactMetric(
        away5?.ppg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
      homeXgFor5: compactMetric(
        home5?.xgForAvg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
      awayXgFor5: compactMetric(
        away5?.xgForAvg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
      homeXgAgainst5: compactMetric(
        home5?.xgAgainstAvg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
      awayXgAgainst5: compactMetric(
        away5?.xgAgainstAvg ?? {
          status: "unavailable",
          value: null,
          sampleSize: 0,
        }
      ),
    },
    periodCompare: team.periodCompare,
    recentExamples: team.recentExamples.slice(0, MAX_RECENT_EXAMPLES),
  };
}

export function buildCompactPrematchAnalyticsContext(
  features: FixtureHistoryFeatures
): CompactPrematchAnalyticsContext {
  const h2h = features.h2h;
  return {
    beforeAt: features.beforeAt,
    home: buildCompactTeam(features.home),
    away: buildCompactTeam(features.away),
    h2h:
      h2h.dataState === "available"
        ? {
            meetings: h2h.meetingsInWindow,
            effectiveWeight: h2h.effectiveMeetingWeight,
            homeWins: h2h.homeWins,
            draws: h2h.draws,
            awayWins: h2h.awayWins,
            recencyHomeWinRate: compactMetric(h2h.recencyWeightedHomeWinRate),
            recencyAvgGoals: compactMetric(h2h.recencyWeightedAvgGoals),
            scope: h2h.scope,
          }
        : null,
  };
}

export function estimateCompactContextBytes(
  context: CompactPrematchAnalyticsContext
): number {
  return Buffer.byteLength(JSON.stringify(context), "utf8");
}

export function assertCompactContextWithinLimit(
  context: CompactPrematchAnalyticsContext
): void {
  const bytes = estimateCompactContextBytes(context);
  if (bytes > MAX_COMPACT_CONTEXT_BYTES) {
    throw new Error(
      `Compact AI context exceeds ${MAX_COMPACT_CONTEXT_BYTES} bytes (${bytes})`
    );
  }
}

/** Map ALL scope window-5 to legacy prematch form slice. */
export function formSliceFromTeamFeatures(
  team: TeamHistoryFeatures
): import("@/types/ai").PrematchFormSlice {
  const w = team.windows.ALL?.[5];
  if (!w || w.played === 0) {
    return null;
  }
  const ppg = w.ppg.status === "available" ? w.ppg.value : null;
  if (ppg === null) {
    return null;
  }
  const gf = w.goalsFor.value != null ? w.goalsFor.value * w.played : 0;
  const ga = w.goalsAgainst.value != null ? w.goalsAgainst.value * w.played : 0;
  return {
    wins: w.wins,
    draws: w.draws,
    losses: w.losses,
    ppg,
    goalsFor: Math.round(gf),
    goalsAgainst: Math.round(ga),
  };
}
