import {
  actualOutcomeFromScore,
  averageMetric,
  brierScore,
  buildConfidenceHistogram,
  logLoss,
  type MatchResultLabel,
} from "@/lib/models/metrics";
import type {
  PrematchFeatureVector,
  WinProbabilities,
} from "@/types/prediction";

export type EvaluationSample = {
  fixtureId: string;
  evaluatedAt: string;
  leagueProviderId: number | null;
  leagueName: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  probabilities: WinProbabilities;
  actual: MatchResultLabel;
  hit1x2: boolean | null;
};

export type CalibrationBin = {
  label: string;
  count: number;
  avgPredicted: number;
  actualRate: number;
};

export type ModelEvaluationSummary = {
  periodDays: number;
  evaluatedCount: number;
  finishedFixturesInPeriod: number;
  coverageRatio: number;
  hitRate1x2: number | null;
  logLoss: number;
  brier: number;
  confidenceHistogram: ReturnType<typeof buildConfidenceHistogram>;
  byLeague: Array<{
    leagueProviderId: number | null;
    leagueName: string | null;
    count: number;
    hitRate1x2: number | null;
    logLoss: number;
    brier: number;
  }>;
  byConfidence: Array<{
    confidence: "HIGH" | "MEDIUM" | "LOW";
    count: number;
    hitRate1x2: number | null;
    logLoss: number;
    brier: number;
  }>;
  calibrationBins: CalibrationBin[];
};

const CALIBRATION_BIN_EDGES = [0.33, 0.4, 0.5, 0.6, 0.7, 1.01];

function maxOutcomeProbability(probabilities: WinProbabilities): number {
  return Math.max(probabilities.home, probabilities.draw, probabilities.away);
}

function favoredOutcome(probabilities: WinProbabilities): MatchResultLabel {
  if (
    probabilities.home >= probabilities.draw &&
    probabilities.home >= probabilities.away
  ) {
    return "1";
  }
  if (
    probabilities.draw >= probabilities.home &&
    probabilities.draw >= probabilities.away
  ) {
    return "X";
  }
  return "2";
}

export function buildCalibrationBins(
  samples: EvaluationSample[]
): CalibrationBin[] {
  const bins: CalibrationBin[] = [];

  for (let index = 0; index < CALIBRATION_BIN_EDGES.length - 1; index += 1) {
    const low = CALIBRATION_BIN_EDGES[index]!;
    const high = CALIBRATION_BIN_EDGES[index + 1]!;
    const inBin = samples.filter((sample) => {
      const maxProb = maxOutcomeProbability(sample.probabilities);
      return maxProb >= low && maxProb < high;
    });

    if (inBin.length === 0) {
      bins.push({
        label: `${Math.round(low * 100)}–${Math.round(Math.min(high, 1) * 100)}%`,
        count: 0,
        avgPredicted: 0,
        actualRate: 0,
      });
      continue;
    }

    const avgPredicted =
      inBin.reduce(
        (sum, sample) => sum + maxOutcomeProbability(sample.probabilities),
        0
      ) / inBin.length;

    const hits = inBin.filter(
      (sample) => favoredOutcome(sample.probabilities) === sample.actual
    ).length;

    bins.push({
      label: `${Math.round(low * 100)}–${Math.round(Math.min(high, 1) * 100)}%`,
      count: inBin.length,
      avgPredicted,
      actualRate: hits / inBin.length,
    });
  }

  return bins;
}

function summarizeGroup(samples: EvaluationSample[]) {
  const hits = samples.filter((sample) => sample.hit1x2 === true).length;
  const withHit = samples.filter((sample) => sample.hit1x2 != null);

  return {
    count: samples.length,
    hitRate1x2: withHit.length > 0 ? hits / withHit.length : null,
    logLoss: averageMetric(
      samples.map((sample) => logLoss(sample.probabilities, sample.actual))
    ),
    brier: averageMetric(
      samples.map((sample) => brierScore(sample.probabilities, sample.actual))
    ),
  };
}

export function summarizeEvaluationSamples(input: {
  periodDays: number;
  samples: EvaluationSample[];
  finishedFixturesInPeriod: number;
}): ModelEvaluationSummary {
  const { samples, periodDays, finishedFixturesInPeriod } = input;
  const evaluatedCount = samples.length;
  const coverageRatio =
    finishedFixturesInPeriod > 0
      ? evaluatedCount / finishedFixturesInPeriod
      : 0;

  const hits = samples.filter((sample) => sample.hit1x2 === true).length;
  const withHit = samples.filter((sample) => sample.hit1x2 != null);

  const leagueGroups = new Map<
    string,
    {
      leagueProviderId: number | null;
      leagueName: string | null;
      samples: EvaluationSample[];
    }
  >();

  for (const sample of samples) {
    const key = String(sample.leagueProviderId ?? "unknown");
    const group = leagueGroups.get(key) ?? {
      leagueProviderId: sample.leagueProviderId,
      leagueName: sample.leagueName,
      samples: [],
    };
    group.samples.push(sample);
    leagueGroups.set(key, group);
  }

  const confidenceGroups = {
    HIGH: [] as EvaluationSample[],
    MEDIUM: [] as EvaluationSample[],
    LOW: [] as EvaluationSample[],
  };

  for (const sample of samples) {
    confidenceGroups[sample.confidence].push(sample);
  }

  return {
    periodDays,
    evaluatedCount,
    finishedFixturesInPeriod,
    coverageRatio,
    hitRate1x2: withHit.length > 0 ? hits / withHit.length : null,
    logLoss: averageMetric(
      samples.map((sample) => logLoss(sample.probabilities, sample.actual))
    ),
    brier: averageMetric(
      samples.map((sample) => brierScore(sample.probabilities, sample.actual))
    ),
    confidenceHistogram: buildConfidenceHistogram(
      samples.map((sample) => sample.confidence)
    ),
    byLeague: [...leagueGroups.values()]
      .map((group) => ({
        leagueProviderId: group.leagueProviderId,
        leagueName: group.leagueName,
        ...summarizeGroup(group.samples),
      }))
      .sort((left, right) => right.count - left.count),
    byConfidence: (["HIGH", "MEDIUM", "LOW"] as const).map((confidence) => ({
      confidence,
      ...summarizeGroup(confidenceGroups[confidence]),
    })),
    calibrationBins: buildCalibrationBins(samples),
  };
}

export function mapRowToEvaluationSample(row: {
  fixture_id: string;
  evaluated_at: string;
  hit_1x2: boolean | null;
  actual_home_goals: number;
  actual_away_goals: number;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  league_provider_id: number | null;
  league_name: string | null;
  input_snapshot: PrematchFeatureVector;
}): EvaluationSample {
  const probabilities: WinProbabilities = {
    home: Number(row.home_win_prob),
    draw: Number(row.draw_prob),
    away: Number(row.away_win_prob),
  };

  return {
    fixtureId: row.fixture_id,
    evaluatedAt: row.evaluated_at,
    leagueProviderId: row.league_provider_id,
    leagueName: row.league_name,
    confidence: row.confidence,
    probabilities,
    actual: actualOutcomeFromScore(
      row.actual_home_goals,
      row.actual_away_goals
    ),
    hit1x2: row.hit_1x2,
  };
}
