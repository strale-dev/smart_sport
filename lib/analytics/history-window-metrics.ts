import type { FormMatchResult } from "@/types/domain";
import type {
  HistoryWindowKey,
  MetricAvailability,
  TeamHistoryScope,
  WindowOutcomeMetrics,
} from "@/lib/analytics/history-feature-types";
import { HISTORY_WINDOW_LIMITS } from "@/lib/analytics/history-feature-types";
import {
  halfLifeForWindow,
  metricFromValue,
  weightForKickoff,
  weightedMean,
  weightedRate,
} from "@/lib/analytics/recency-weight";

export type XgPair = { xgFor: number; xgAgainst: number };

export type OpponentEloAtKickoff = number | null;

export function buildWindowOutcomeMetrics(input: {
  window: HistoryWindowKey;
  scope: TeamHistoryScope;
  beforeAt: string;
  results: FormMatchResult[];
  xgByFixtureId: Map<number, XgPair>;
  opponentEloByFixtureId: Map<number, OpponentEloAtKickoff>;
}): WindowOutcomeMetrics {
  const requested = HISTORY_WINDOW_LIMITS[input.window];
  const slice = input.results.slice(0, requested);
  const played = slice.length;

  const wins = slice.filter((r) => r.result === "W").length;
  const draws = slice.filter((r) => r.result === "D").length;
  const losses = slice.filter((r) => r.result === "L").length;
  const goalsFor = slice.reduce((s, r) => s + r.goalsFor, 0);
  const goalsAgainst = slice.reduce((s, r) => s + r.goalsAgainst, 0);
  const cleanSheets = slice.filter((r) => r.goalsAgainst === 0).length;
  const failedToScore = slice.filter((r) => r.goalsFor === 0).length;

  const halfLife = halfLifeForWindow(input.window);

  const ppgValues: Array<{ value: number; weight: number }> = [];
  const gfValues: Array<{ value: number; weight: number }> = [];
  const gaValues: Array<{ value: number; weight: number }> = [];
  const bttsSamples: Array<{ hit: boolean; weight: number }> = [];
  const over25Samples: Array<{ hit: boolean; weight: number }> = [];
  const under25Samples: Array<{ hit: boolean; weight: number }> = [];
  const xgForSamples: Array<{ value: number; weight: number }> = [];
  const xgAgainstSamples: Array<{ value: number; weight: number }> = [];
  const oppEloSamples: Array<{ value: number; weight: number }> = [];

  for (const r of slice) {
    const w = weightForKickoff({
      kickoffAt: r.kickoffAt,
      beforeAt: input.beforeAt,
      halfLifeDays: halfLife,
    });
    const points = r.result === "W" ? 3 : r.result === "D" ? 1 : 0;
    ppgValues.push({ value: points, weight: w });
    gfValues.push({ value: r.goalsFor, weight: w });
    gaValues.push({ value: r.goalsAgainst, weight: w });
    const totalGoals = r.goalsFor + r.goalsAgainst;
    bttsSamples.push({
      hit: r.goalsFor > 0 && r.goalsAgainst > 0,
      weight: w,
    });
    over25Samples.push({ hit: totalGoals > 2.5, weight: w });
    under25Samples.push({ hit: totalGoals < 2.5, weight: w });

    const xg = input.xgByFixtureId.get(r.fixtureExternalId);
    if (xg) {
      xgForSamples.push({ value: xg.xgFor, weight: w });
      xgAgainstSamples.push({ value: xg.xgAgainst, weight: w });
    }

    const oppElo = input.opponentEloByFixtureId.get(r.fixtureExternalId);
    if (oppElo != null) {
      oppEloSamples.push({ value: oppElo, weight: w });
    }
  }

  const simplePpg = played > 0 ? (wins * 3 + draws) / played : null;
  const winRate = played > 0 ? wins / played : null;
  const gfPg = played > 0 ? goalsFor / played : null;
  const gaPg = played > 0 ? goalsAgainst / played : null;
  const gdPg = played > 0 ? (goalsFor - goalsAgainst) / played : null;

  const bttsSimple =
    played > 0 ? bttsSamples.filter((s) => s.hit).length / played : null;
  const over25Simple =
    played > 0 ? over25Samples.filter((s) => s.hit).length / played : null;
  const under25Simple =
    played > 0 ? under25Samples.filter((s) => s.hit).length / played : null;

  const xgForAvg =
    xgForSamples.length > 0
      ? xgForSamples.reduce((s, x) => s + x.value, 0) / xgForSamples.length
      : null;
  const xgAgainstAvg =
    xgAgainstSamples.length > 0
      ? xgAgainstSamples.reduce((s, x) => s + x.value, 0) /
        xgAgainstSamples.length
      : null;

  return {
    window: input.window,
    scope: input.scope,
    played,
    requested,
    wins,
    draws,
    losses,
    winRate: metricFromValue(winRate, played),
    ppg: metricFromValue(simplePpg, played),
    goalsFor: metricFromValue(gfPg, played),
    goalsAgainst: metricFromValue(gaPg, played),
    goalDifference: metricFromValue(gdPg, played),
    cleanSheets: metricFromValue(
      played > 0 ? cleanSheets / played : null,
      played
    ),
    failedToScore: metricFromValue(
      played > 0 ? failedToScore / played : null,
      played
    ),
    bttsRate: metricFromValue(weightedRate(bttsSamples) ?? bttsSimple, played),
    over25Rate: metricFromValue(
      weightedRate(over25Samples) ?? over25Simple,
      played
    ),
    under25Rate: metricFromValue(
      weightedRate(under25Samples) ?? under25Simple,
      played
    ),
    xgForAvg: metricFromValue(xgForAvg, xgForSamples.length, "no_xg_in_window"),
    xgAgainstAvg: metricFromValue(
      xgAgainstAvg,
      xgAgainstSamples.length,
      "no_xg_in_window"
    ),
    recencyWeightedPpg: metricFromValue(weightedMean(ppgValues), played),
    recencyWeightedGoalsFor: metricFromValue(weightedMean(gfValues), played),
    recencyWeightedGoalsAgainst: metricFromValue(
      weightedMean(gaValues),
      played
    ),
    opponentStrengthElo: metricFromValue(
      weightedMean(oppEloSamples),
      oppEloSamples.length,
      "opponent_elo_unavailable"
    ),
    scheduleDifficultyElo: metricFromValue(
      weightedMean(oppEloSamples),
      oppEloSamples.length,
      "opponent_elo_unavailable"
    ),
  };
}

export function buildPeriodCompare(input: {
  beforeAt: string;
  results: FormMatchResult[];
  recentSize: 5 | 10;
}): import("@/lib/analytics/history-feature-types").PeriodCompareMetrics {
  const recent = input.results.slice(0, input.recentSize);
  const previous = input.results.slice(input.recentSize, input.recentSize * 2);

  const ppgFor = (rows: FormMatchResult[]): number | null => {
    if (rows.length === 0) {
      return null;
    }
    const pts = rows.reduce(
      (s, r) => s + (r.result === "W" ? 3 : r.result === "D" ? 1 : 0),
      0
    );
    return pts / rows.length;
  };

  const gpg = (rows: FormMatchResult[], field: "goalsFor" | "goalsAgainst") => {
    if (rows.length === 0) {
      return null;
    }
    return rows.reduce((s, r) => s + r[field], 0) / rows.length;
  };

  return {
    recentWindow: input.recentSize,
    recentPpg: metricFromValue(ppgFor(recent), recent.length),
    previousPpg: metricFromValue(ppgFor(previous), previous.length),
    recentGoalsForPerGame: metricFromValue(
      gpg(recent, "goalsFor"),
      recent.length
    ),
    previousGoalsForPerGame: metricFromValue(
      gpg(previous, "goalsFor"),
      previous.length
    ),
    recentGoalsAgainstPerGame: metricFromValue(
      gpg(recent, "goalsAgainst"),
      recent.length
    ),
    previousGoalsAgainstPerGame: metricFromValue(
      gpg(previous, "goalsAgainst"),
      previous.length
    ),
  };
}

export function unavailableMetric(reason: string): MetricAvailability {
  return {
    status: "unavailable",
    value: null,
    sampleSize: 0,
    reason,
  };
}
