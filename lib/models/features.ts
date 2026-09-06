import {
  computeFormBefore,
  computeH2HBefore,
  computeLeagueRanksBefore,
  computeRestDaysBefore,
  computeTeamXgAveragesBefore,
} from "@/lib/analytics/point-in-time";
import {
  bucketConfidence,
  predictedOutcomeFromProbabilities,
} from "@/lib/models/confidence";
import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";
import { computeLogisticProbabilities } from "@/lib/models/logistic";
import { computePoissonOutput } from "@/lib/models/poisson";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ModelCoefficients,
  PrematchFeatureVector,
  PrematchModelOutput,
  PredictionDataQuality,
} from "@/types/prediction";

type BuildPrematchFeaturesInput = {
  fixtureExternalId: number;
  asOf?: string;
  eloHome?: number;
  eloAway?: number;
};

type FixtureContext = {
  id: string;
  provider_id: number;
  kickoff_at: string;
  home_team_id: string;
  away_team_id: string;
  league_id: string;
  season_id: string | null;
  home_team: { provider_id: number; elo_rating: number | null };
  away_team: { provider_id: number; elo_rating: number | null };
  league: { provider_id: number };
};

async function loadFixtureContext(
  fixtureExternalId: number
): Promise<FixtureContext | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      kickoff_at,
      home_team_id,
      away_team_id,
      league_id,
      season_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id, elo_rating),
      away_team:teams!fixtures_away_team_id_fkey (provider_id, elo_rating),
      league:leagues (provider_id)
    `
    )
    .eq("provider_id", fixtureExternalId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load fixture ${fixtureExternalId}: ${error.message}`
    );
  }

  if (!data?.home_team || !data.away_team || !data.league) {
    return null;
  }

  return data as FixtureContext;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export async function buildPrematchFeatures(
  fixtureExternalId: number,
  options: BuildPrematchFeaturesInput = { fixtureExternalId }
): Promise<PrematchFeatureVector | null> {
  const context = await loadFixtureContext(fixtureExternalId);
  if (!context) {
    return null;
  }

  const homeTeam = unwrapRelation(context.home_team);
  const awayTeam = unwrapRelation(context.away_team);
  const league = unwrapRelation(context.league);
  if (!homeTeam || !awayTeam || !league) {
    return null;
  }

  const asOf = options.asOf ?? context.kickoff_at;
  const defaultRating = DEFAULT_MODEL_COEFFICIENTS.elo.defaultRating;
  const eloHome =
    options.eloHome ?? Number(homeTeam.elo_rating ?? defaultRating);
  const eloAway =
    options.eloAway ?? Number(awayTeam.elo_rating ?? defaultRating);

  const [
    form5Home,
    form5Away,
    form10Home,
    form10Away,
    h2h,
    homeRestDays,
    awayRestDays,
    homeXg,
    awayXg,
    ranks,
  ] = await Promise.all([
    computeFormBefore(
      homeTeam.provider_id,
      context.home_team_id,
      asOf,
      5,
      "ALL"
    ),
    computeFormBefore(
      awayTeam.provider_id,
      context.away_team_id,
      asOf,
      5,
      "ALL"
    ),
    computeFormBefore(
      homeTeam.provider_id,
      context.home_team_id,
      asOf,
      10,
      "ALL"
    ),
    computeFormBefore(
      awayTeam.provider_id,
      context.away_team_id,
      asOf,
      10,
      "ALL"
    ),
    computeH2HBefore(
      homeTeam.provider_id,
      awayTeam.provider_id,
      context.home_team_id,
      context.away_team_id,
      asOf,
      10
    ),
    computeRestDaysBefore(context.home_team_id, asOf),
    computeRestDaysBefore(context.away_team_id, asOf),
    computeTeamXgAveragesBefore(context.home_team_id, asOf, 5),
    computeTeamXgAveragesBefore(context.away_team_id, asOf, 5),
    computeLeagueRanksBefore({
      leagueUuid: context.league_id,
      seasonUuid: context.season_id,
      homeTeamUuid: context.home_team_id,
      awayTeamUuid: context.away_team_id,
      beforeAt: asOf,
    }),
  ]);

  const homeMeetings = h2h.meetings.length;
  const h2hHomeWinRate = homeMeetings > 0 ? h2h.teamAWins / homeMeetings : null;
  const h2hGoalAvg =
    homeMeetings > 0
      ? Number(((h2h.teamAGoals + h2h.teamBGoals) / homeMeetings).toFixed(2))
      : null;

  const hasXg = homeXg.samples > 0 && awayXg.samples > 0;
  const dataQuality: PredictionDataQuality =
    form5Home.matches >= 3 &&
    form5Away.matches >= 3 &&
    (hasXg || homeXg.samples === 0)
      ? hasXg
        ? "COMPLETE"
        : "PARTIAL"
      : "PARTIAL";

  const leaguePositionDiff =
    ranks.homeRank != null && ranks.awayRank != null
      ? ranks.awayRank - ranks.homeRank
      : null;

  return {
    fixtureExternalId,
    asOf,
    homeTeamProviderId: homeTeam.provider_id,
    awayTeamProviderId: awayTeam.provider_id,
    leagueProviderId: league.provider_id,
    eloHome,
    eloAway,
    eloDiff: eloHome - eloAway,
    form5HomePpg: form5Home.ppg,
    form5AwayPpg: form5Away.ppg,
    form10HomePpg: form10Home.ppg,
    form10AwayPpg: form10Away.ppg,
    h2hHomeWinRate,
    h2hGoalAvg,
    homeLeagueRank: ranks.homeRank,
    awayLeagueRank: ranks.awayRank,
    leaguePositionDiff,
    homeRestDays,
    awayRestDays,
    homeGoalsForAvg:
      form5Home.matches > 0
        ? Number((form5Home.goalsFor / form5Home.matches).toFixed(2))
        : null,
    awayGoalsForAvg:
      form5Away.matches > 0
        ? Number((form5Away.goalsFor / form5Away.matches).toFixed(2))
        : null,
    homeGoalsAgainstAvg:
      form5Home.matches > 0
        ? Number((form5Home.goalsAgainst / form5Home.matches).toFixed(2))
        : null,
    awayGoalsAgainstAvg:
      form5Away.matches > 0
        ? Number((form5Away.goalsAgainst / form5Away.matches).toFixed(2))
        : null,
    homeXgForAvg: homeXg.xgForAvg,
    awayXgForAvg: awayXg.xgForAvg,
    homeXgAgainstAvg: homeXg.xgAgainstAvg,
    awayXgAgainstAvg: awayXg.xgAgainstAvg,
    hasXg,
    dataQuality,
  };
}

export function scorePrematchFromFeatures(
  features: PrematchFeatureVector,
  coefficients: ModelCoefficients = DEFAULT_MODEL_COEFFICIENTS
): PrematchModelOutput {
  const winProbabilities = computeLogisticProbabilities(
    features,
    coefficients.logistic
  );
  const poisson = computePoissonOutput(features, coefficients.poisson);
  const confidence = bucketConfidence(winProbabilities);

  return {
    winProbabilities,
    expectedGoalsHome: poisson.expectedGoalsHome,
    expectedGoalsAway: poisson.expectedGoalsAway,
    expectedGoalsTotalMin: poisson.expectedGoalsTotalMin,
    expectedGoalsTotalMax: poisson.expectedGoalsTotalMax,
    bttsProb: poisson.bttsProb,
    weakerTeamScoringProb: poisson.weakerTeamScoringProb,
    confidence,
    predictedOutcome: predictedOutcomeFromProbabilities(winProbabilities),
  };
}

export async function scorePrematchFixture(
  fixtureExternalId: number,
  options: BuildPrematchFeaturesInput = { fixtureExternalId },
  coefficients: ModelCoefficients = DEFAULT_MODEL_COEFFICIENTS
): Promise<{
  features: PrematchFeatureVector;
  output: PrematchModelOutput;
} | null> {
  const features = await buildPrematchFeatures(fixtureExternalId, options);
  if (!features) {
    return null;
  }

  return {
    features,
    output: scorePrematchFromFeatures(features, coefficients),
  };
}
