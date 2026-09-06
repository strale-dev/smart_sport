import {
  applyEloResultToMap,
  getRatingFromMap,
  type EloRatingMap,
} from "@/lib/models/elo";
import {
  actualOutcomeFromScore,
  averageMetric,
  brierScore,
  buildConfidenceHistogram,
  leagueHomeRateProbabilities,
  logLoss,
  uniformProbabilities,
} from "@/lib/models/metrics";
import { bucketConfidence } from "@/lib/models/confidence";
import {
  buildPrematchFeatures,
  scorePrematchFromFeatures,
} from "@/lib/models/features";
import { summarizeProbabilityDistribution } from "@/lib/models/logistic";
import { getActiveModelVersion } from "@/lib/predictions/db";
import { loadTerminalFixturesChronological } from "@/lib/analytics/point-in-time";

const MIN_BACKTEST_MATCHES = 50;

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

type LeagueOutcomeStats = {
  homeWins: number;
  draws: number;
  awayWins: number;
  total: number;
};

function smoothedLeagueBaseline(stats: LeagueOutcomeStats) {
  const total = stats.total + 3;
  return leagueHomeRateProbabilities(
    (stats.homeWins + 1) / total,
    (stats.draws + 1) / total
  );
}

function updateLeagueStats(
  statsByLeague: Map<number, LeagueOutcomeStats>,
  leagueProviderId: number,
  outcome: "1" | "X" | "2"
) {
  const stats = statsByLeague.get(leagueProviderId) ?? {
    homeWins: 0,
    draws: 0,
    awayWins: 0,
    total: 0,
  };

  stats.total += 1;
  if (outcome === "1") {
    stats.homeWins += 1;
  } else if (outcome === "X") {
    stats.draws += 1;
  } else {
    stats.awayWins += 1;
  }

  statsByLeague.set(leagueProviderId, stats);
}

export async function runPhase4Backtest() {
  const fixtures = await loadTerminalFixturesChronological();
  const modelVersion = await getActiveModelVersion();
  const eloState: EloRatingMap = new Map();
  const leagueStats = new Map<number, LeagueOutcomeStats>();

  const modelLogLoss: number[] = [];
  const modelBrier: number[] = [];
  const uniformLogLoss: number[] = [];
  const uniformBrier: number[] = [];
  const leagueBaselineLogLoss: number[] = [];
  const leagueBaselineBrier: number[] = [];
  const confidenceBuckets: Array<"HIGH" | "MEDIUM" | "LOW"> = [];
  const probabilitySamples: Array<{
    home: number;
    draw: number;
    away: number;
  }> = [];

  let evaluated = 0;

  for (const fixture of fixtures) {
    const homeTeam = unwrapRelation(fixture.home_team);
    const awayTeam = unwrapRelation(fixture.away_team);
    const league = unwrapRelation(fixture.league);

    if (
      !homeTeam ||
      !awayTeam ||
      !league ||
      fixture.score_home == null ||
      fixture.score_away == null
    ) {
      continue;
    }

    const eloHome = getRatingFromMap(eloState, homeTeam.provider_id);
    const eloAway = getRatingFromMap(eloState, awayTeam.provider_id);

    const features = await buildPrematchFeatures(fixture.provider_id, {
      fixtureExternalId: fixture.provider_id,
      asOf: fixture.kickoff_at,
      eloHome,
      eloAway,
    });

    if (!features) {
      continue;
    }

    const output = scorePrematchFromFeatures(
      features,
      modelVersion.coefficients
    );
    const actual = actualOutcomeFromScore(
      fixture.score_home,
      fixture.score_away
    );

    const priorStats = leagueStats.get(league.provider_id) ?? {
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      total: 0,
    };
    const leagueBaseline =
      priorStats.total > 0
        ? smoothedLeagueBaseline(priorStats)
        : uniformProbabilities();

    modelLogLoss.push(logLoss(output.winProbabilities, actual));
    modelBrier.push(brierScore(output.winProbabilities, actual));
    uniformLogLoss.push(logLoss(uniformProbabilities(), actual));
    uniformBrier.push(brierScore(uniformProbabilities(), actual));
    leagueBaselineLogLoss.push(logLoss(leagueBaseline, actual));
    leagueBaselineBrier.push(brierScore(leagueBaseline, actual));

    updateLeagueStats(leagueStats, league.provider_id, actual);

    confidenceBuckets.push(bucketConfidence(output.winProbabilities));
    probabilitySamples.push(output.winProbabilities);
    evaluated += 1;

    applyEloResultToMap(eloState, {
      homeTeamProviderId: homeTeam.provider_id,
      awayTeamProviderId: awayTeam.provider_id,
      homeGoals: fixture.score_home,
      awayGoals: fixture.score_away,
      leagueProviderId: league.provider_id,
      coefficients: modelVersion.coefficients.elo,
    });
  }

  const histogram = buildConfidenceHistogram(confidenceBuckets);
  const calibration = summarizeProbabilityDistribution(probabilitySamples);
  const lowShare = evaluated > 0 ? histogram.LOW / evaluated : 0;

  const summary = {
    evaluated,
    model: {
      logLoss: averageMetric(modelLogLoss),
      brier: averageMetric(modelBrier),
    },
    baselineUniform: {
      logLoss: averageMetric(uniformLogLoss),
      brier: averageMetric(uniformBrier),
    },
    baselineLeagueHomeRate: {
      logLoss: averageMetric(leagueBaselineLogLoss),
      brier: averageMetric(leagueBaselineBrier),
    },
    confidenceHistogram: histogram,
    calibration,
    warnings: [] as string[],
  };

  if (evaluated < MIN_BACKTEST_MATCHES) {
    summary.warnings.push(
      `Only ${evaluated} matches evaluated (< ${MIN_BACKTEST_MATCHES}); metrics are indicative only.`
    );
  }

  if (lowShare > 0.8 && evaluated > 0) {
    summary.warnings.push(
      `${Math.round(lowShare * 100)}% of matches in LOW confidence bucket — review 60/40 thresholds or coefficients.`
    );
  }

  const passes =
    summary.model.logLoss < summary.baselineUniform.logLoss &&
    summary.model.logLoss < summary.baselineLeagueHomeRate.logLoss;

  return { summary, passes };
}

async function main() {
  console.log("Running Phase 4 backtest...");
  const { summary, passes } = await runPhase4Backtest();
  console.log(JSON.stringify(summary, null, 2));

  if (summary.evaluated >= MIN_BACKTEST_MATCHES && !passes) {
    console.error(
      "Backtest failed: model log-loss is not better than baselines."
    );
    process.exit(1);
  }

  if (summary.evaluated < MIN_BACKTEST_MATCHES) {
    console.warn(
      "Backtest sample too small for strict gate — review metrics manually."
    );
  } else {
    console.log("Backtest passed log-loss gate.");
  }
}

main().catch((error) => {
  console.error("Phase 4 backtest failed:", error);
  process.exit(1);
});
