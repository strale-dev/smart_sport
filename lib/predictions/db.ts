import { parseModelCoefficients } from "@/lib/models/coefficients";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LiveFeatureVector,
  PrematchFeatureVector,
  PrematchPredictionResult,
  PrematchPredictionRow,
  LivePredictionRow,
  LivePredictionResult,
} from "@/types/prediction";
import type { Json } from "@/types/supabase";

export type ActiveModelVersion = {
  id: string;
  version: string;
  coefficients: ReturnType<typeof parseModelCoefficients>;
};

export async function getActiveModelVersion(): Promise<ActiveModelVersion> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("model_versions")
    .select("id, version, coefficients")
    .eq("is_active", true)
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active model version: ${error.message}`);
  }

  if (!data) {
    throw new Error("No active model version configured");
  }

  return {
    id: data.id,
    version: data.version,
    coefficients: parseModelCoefficients(data.coefficients),
  };
}

export async function readLatestPrematchPrediction(
  fixtureUuid: string
): Promise<PrematchPredictionRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("predictions")
    .select(
      `
      id,
      fixture_id,
      model_version_id,
      home_win_prob,
      draw_prob,
      away_win_prob,
      expected_goals_home,
      expected_goals_away,
      expected_goals_total_min,
      expected_goals_total_max,
      btts_prob,
      weaker_team_scoring_prob,
      confidence,
      input_snapshot,
      created_at
    `
    )
    .eq("fixture_id", fixtureUuid)
    .eq("type", "PREMATCH")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to read latest prematch prediction: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    input_snapshot: data.input_snapshot as PrematchFeatureVector,
  };
}

export async function insertPrematchPrediction(input: {
  fixtureUuid: string;
  modelVersionId: string;
  fixtureExternalId: number;
  modelVersion: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  bttsProb: number;
  weakerTeamScoringProb: number;
  confidence: PrematchPredictionResult["confidence"];
  inputSnapshot: PrematchFeatureVector;
}): Promise<PrematchPredictionRow> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("predictions")
    .insert({
      fixture_id: input.fixtureUuid,
      model_version_id: input.modelVersionId,
      type: "PREMATCH",
      minute: null,
      home_win_prob: input.homeWinProb,
      draw_prob: input.drawProb,
      away_win_prob: input.awayWinProb,
      expected_goals_home: input.expectedGoalsHome,
      expected_goals_away: input.expectedGoalsAway,
      expected_goals_total_min: input.expectedGoalsTotalMin,
      expected_goals_total_max: input.expectedGoalsTotalMax,
      btts_prob: input.bttsProb,
      weaker_team_scoring_prob: input.weakerTeamScoringProb,
      confidence: input.confidence,
      input_snapshot: input.inputSnapshot as unknown as Json,
    })
    .select(
      `
      id,
      fixture_id,
      model_version_id,
      home_win_prob,
      draw_prob,
      away_win_prob,
      expected_goals_home,
      expected_goals_away,
      expected_goals_total_min,
      expected_goals_total_max,
      btts_prob,
      weaker_team_scoring_prob,
      confidence,
      input_snapshot,
      created_at
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to insert prematch prediction: ${error.message}`);
  }

  return {
    ...data,
    input_snapshot: data.input_snapshot as PrematchFeatureVector,
  };
}

export function mapPredictionRowToResult(
  row: PrematchPredictionRow,
  fixtureExternalId: number,
  modelVersion: string,
  fromCache: boolean
): PrematchPredictionResult {
  const winProbabilities = {
    home: Number(row.home_win_prob),
    draw: Number(row.draw_prob),
    away: Number(row.away_win_prob),
  };

  const maxProb = Math.max(
    winProbabilities.home,
    winProbabilities.draw,
    winProbabilities.away
  );
  const predictedOutcome =
    winProbabilities.home === maxProb
      ? "1"
      : winProbabilities.draw === maxProb
        ? "X"
        : "2";

  return {
    fixtureId: row.fixture_id,
    fixtureExternalId,
    modelVersionId: row.model_version_id,
    modelVersion,
    predictionId: row.id,
    type: "PREMATCH",
    winProbabilities,
    expectedGoalsHome: Number(row.expected_goals_home ?? 0),
    expectedGoalsAway: Number(row.expected_goals_away ?? 0),
    expectedGoalsTotalMin: Number(row.expected_goals_total_min ?? 0),
    expectedGoalsTotalMax: Number(row.expected_goals_total_max ?? 0),
    bttsProb: Number(row.btts_prob ?? 0),
    weakerTeamScoringProb: Number(row.weaker_team_scoring_prob ?? 0),
    confidence: row.confidence,
    predictedOutcome,
    inputSnapshot: row.input_snapshot,
    createdAt: row.created_at,
    fromCache,
  };
}

export async function readLatestLivePrediction(
  fixtureUuid: string
): Promise<LivePredictionRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("predictions")
    .select(
      `
      id,
      fixture_id,
      model_version_id,
      minute,
      home_win_prob,
      draw_prob,
      away_win_prob,
      expected_goals_home,
      expected_goals_away,
      expected_goals_total_min,
      expected_goals_total_max,
      btts_prob,
      weaker_team_scoring_prob,
      confidence,
      input_snapshot,
      created_at
    `
    )
    .eq("fixture_id", fixtureUuid)
    .eq("type", "LIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read latest live prediction: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    input_snapshot: data.input_snapshot as LiveFeatureVector,
  };
}

export async function insertLivePrediction(input: {
  fixtureUuid: string;
  modelVersionId: string;
  fixtureExternalId: number;
  modelVersion: string;
  minute: number | null;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotalMin: number;
  expectedGoalsTotalMax: number;
  bttsProb: number;
  weakerTeamScoringProb: number;
  confidence: PrematchPredictionResult["confidence"];
  inputSnapshot: LiveFeatureVector;
}): Promise<LivePredictionRow> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("predictions")
    .insert({
      fixture_id: input.fixtureUuid,
      model_version_id: input.modelVersionId,
      type: "LIVE",
      minute: input.minute,
      home_win_prob: input.homeWinProb,
      draw_prob: input.drawProb,
      away_win_prob: input.awayWinProb,
      expected_goals_home: input.expectedGoalsHome,
      expected_goals_away: input.expectedGoalsAway,
      expected_goals_total_min: input.expectedGoalsTotalMin,
      expected_goals_total_max: input.expectedGoalsTotalMax,
      btts_prob: input.bttsProb,
      weaker_team_scoring_prob: input.weakerTeamScoringProb,
      confidence: input.confidence,
      input_snapshot: input.inputSnapshot as unknown as Json,
    })
    .select(
      `
      id,
      fixture_id,
      model_version_id,
      minute,
      home_win_prob,
      draw_prob,
      away_win_prob,
      expected_goals_home,
      expected_goals_away,
      expected_goals_total_min,
      expected_goals_total_max,
      btts_prob,
      weaker_team_scoring_prob,
      confidence,
      input_snapshot,
      created_at
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to insert live prediction: ${error.message}`);
  }

  return {
    ...data,
    input_snapshot: data.input_snapshot as LiveFeatureVector,
  };
}

export function mapLivePredictionRowToResult(
  row: LivePredictionRow,
  fixtureExternalId: number,
  modelVersion: string,
  fromCache: boolean
): LivePredictionResult {
  const winProbabilities = {
    home: Number(row.home_win_prob),
    draw: Number(row.draw_prob),
    away: Number(row.away_win_prob),
  };

  const maxProb = Math.max(
    winProbabilities.home,
    winProbabilities.draw,
    winProbabilities.away
  );
  const predictedOutcome =
    winProbabilities.home === maxProb
      ? "1"
      : winProbabilities.draw === maxProb
        ? "X"
        : "2";

  return {
    fixtureId: row.fixture_id,
    fixtureExternalId,
    modelVersionId: row.model_version_id,
    modelVersion,
    predictionId: row.id,
    type: "LIVE",
    minute: row.minute,
    winProbabilities,
    expectedGoalsHome: Number(row.expected_goals_home ?? 0),
    expectedGoalsAway: Number(row.expected_goals_away ?? 0),
    expectedGoalsTotalMin: Number(row.expected_goals_total_min ?? 0),
    expectedGoalsTotalMax: Number(row.expected_goals_total_max ?? 0),
    bttsProb: Number(row.btts_prob ?? 0),
    weakerTeamScoringProb: Number(row.weaker_team_scoring_prob ?? 0),
    confidence: row.confidence,
    predictedOutcome,
    inputSnapshot: row.input_snapshot,
    createdAt: row.created_at,
    fromCache,
  };
}

export async function resolveFixtureUuidByExternalId(
  fixtureExternalId: number
): Promise<{ id: string; status: string; kickoff_at: string } | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id, status, kickoff_at")
    .eq("provider_id", fixtureExternalId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve fixture ${fixtureExternalId}: ${error.message}`
    );
  }

  return data;
}

export async function batchUpdateTeamEloRatings(
  ratings: Map<number, number>
): Promise<number> {
  const client = createAdminClient();
  let updated = 0;

  for (const [providerId, eloRating] of ratings.entries()) {
    const { error } = await client
      .from("teams")
      .update({ elo_rating: Number(eloRating.toFixed(2)) })
      .eq("provider_id", providerId);

    if (error) {
      throw new Error(
        `Failed to update Elo for team ${providerId}: ${error.message}`
      );
    }
    updated += 1;
  }

  return updated;
}
