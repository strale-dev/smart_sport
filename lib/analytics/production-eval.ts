import {
  mapRowToEvaluationSample,
  summarizeEvaluationSamples,
  type EvaluationSample,
  type ModelEvaluationSummary,
} from "@/lib/analytics/model-evaluation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrematchFeatureVector } from "@/types/prediction";

const FINISHED_STATUSES = ["FT", "AET", "PEN"] as const;

function periodStartIso(days: number): string {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

type EvaluationRow = {
  fixture_id: string;
  evaluated_at: string;
  hit_1x2: boolean | null;
  actual_home_goals: number;
  actual_away_goals: number;
  predictions: {
    home_win_prob: number;
    draw_prob: number;
    away_win_prob: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    input_snapshot: PrematchFeatureVector;
  } | null;
  fixtures: {
    league_id: string | null;
    leagues:
      | { provider_id: number; name: string }
      | { provider_id: number; name: string }[]
      | null;
  } | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export async function loadProductionEvaluationSamples(
  periodDays: number
): Promise<EvaluationSample[]> {
  const since = periodStartIso(periodDays);
  const client = createAdminClient();

  const { data, error } = await client
    .from("prediction_evaluations")
    .select(
      `
      fixture_id,
      evaluated_at,
      hit_1x2,
      actual_home_goals,
      actual_away_goals,
      predictions (
        home_win_prob,
        draw_prob,
        away_win_prob,
        confidence,
        input_snapshot
      ),
      fixtures (
        league_id,
        leagues (
          provider_id,
          name
        )
      )
    `
    )
    .gte("evaluated_at", since)
    .order("evaluated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load prediction evaluations: ${error.message}`);
  }

  const rows = (data ?? []) as EvaluationRow[];
  const samples: EvaluationSample[] = [];

  for (const row of rows) {
    const prediction = row.predictions;
    if (!prediction) {
      continue;
    }

    const league = unwrapRelation(row.fixtures?.leagues ?? null);

    samples.push(
      mapRowToEvaluationSample({
        fixture_id: row.fixture_id,
        evaluated_at: row.evaluated_at,
        hit_1x2: row.hit_1x2,
        actual_home_goals: row.actual_home_goals,
        actual_away_goals: row.actual_away_goals,
        home_win_prob: prediction.home_win_prob,
        draw_prob: prediction.draw_prob,
        away_win_prob: prediction.away_win_prob,
        confidence: prediction.confidence,
        league_provider_id: league?.provider_id ?? null,
        league_name: league?.name ?? null,
        input_snapshot: prediction.input_snapshot,
      })
    );
  }

  return samples;
}

export async function countFinishedFixturesInPeriod(
  periodDays: number
): Promise<number> {
  const since = periodStartIso(periodDays);
  const client = createAdminClient();

  const { count, error } = await client
    .from("fixtures")
    .select("id", { count: "exact", head: true })
    .gte("kickoff_at", since)
    .in("status", [...FINISHED_STATUSES]);

  if (error) {
    throw new Error(`Failed to count finished fixtures: ${error.message}`);
  }

  return count ?? 0;
}

export async function runProductionEvaluation(
  periodDays: number
): Promise<ModelEvaluationSummary> {
  const [samples, finishedFixturesInPeriod] = await Promise.all([
    loadProductionEvaluationSamples(periodDays),
    countFinishedFixturesInPeriod(periodDays),
  ]);

  return summarizeEvaluationSamples({
    periodDays,
    samples,
    finishedFixturesInPeriod,
  });
}

export type ProductionEvalSampleWithFeatures = EvaluationSample & {
  inputSnapshot: PrematchFeatureVector;
};

export async function loadProductionEvalSamplesWithFeatures(
  periodDays: number
): Promise<ProductionEvalSampleWithFeatures[]> {
  const since = periodStartIso(periodDays);
  const client = createAdminClient();

  const { data, error } = await client
    .from("prediction_evaluations")
    .select(
      `
      fixture_id,
      evaluated_at,
      hit_1x2,
      actual_home_goals,
      actual_away_goals,
      predictions (
        home_win_prob,
        draw_prob,
        away_win_prob,
        confidence,
        input_snapshot
      ),
      fixtures (
        league_id,
        leagues (
          provider_id,
          name
        )
      )
    `
    )
    .gte("evaluated_at", since)
    .order("evaluated_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load calibration samples: ${error.message}`);
  }

  const rows = (data ?? []) as EvaluationRow[];
  const samples: ProductionEvalSampleWithFeatures[] = [];

  for (const row of rows) {
    const prediction = row.predictions;
    if (!prediction) {
      continue;
    }

    const league = unwrapRelation(row.fixtures?.leagues ?? null);
    const base = mapRowToEvaluationSample({
      fixture_id: row.fixture_id,
      evaluated_at: row.evaluated_at,
      hit_1x2: row.hit_1x2,
      actual_home_goals: row.actual_home_goals,
      actual_away_goals: row.actual_away_goals,
      home_win_prob: prediction.home_win_prob,
      draw_prob: prediction.draw_prob,
      away_win_prob: prediction.away_win_prob,
      confidence: prediction.confidence,
      league_provider_id: league?.provider_id ?? null,
      league_name: league?.name ?? null,
      input_snapshot: prediction.input_snapshot,
    });

    samples.push({
      ...base,
      inputSnapshot: prediction.input_snapshot,
    });
  }

  return samples;
}
