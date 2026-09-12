import { createAdminClient } from "@/lib/supabase/admin";
import type { AIInsightPayload } from "@/lib/ai/schemas";
import type { Database, Json } from "@/types/supabase";

export type AiInsightRow = Database["public"]["Tables"]["ai_insights"]["Row"];

function formatExpectedGoalsRange(range: [number, number]): string {
  const min = Math.round(range[0]);
  const max = Math.round(range[1]);
  return `[${min},${max}]`;
}

export async function readLatestLiveInsight(
  fixtureUuid: string
): Promise<AiInsightRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_insights")
    .select("*")
    .eq("fixture_id", fixtureUuid)
    .eq("type", "LIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read latest live insight: ${error.message}`);
  }

  return data;
}

const LIVE_AI_FRESHNESS_MS = 15 * 60 * 1000;

/** Latest LIVE insight `created_at` per fixture within the last 15 minutes. */
export async function readRecentLiveInsightTimestamps(
  fixtureUuids: string[],
  now = new Date()
): Promise<Map<string, string>> {
  if (fixtureUuids.length === 0) {
    return new Map();
  }

  const since = new Date(now.getTime() - LIVE_AI_FRESHNESS_MS).toISOString();
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_insights")
    .select("fixture_id, created_at")
    .eq("type", "LIVE")
    .in("fixture_id", fixtureUuids)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to read recent live insight timestamps: ${error.message}`
    );
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.fixture_id == null) {
      continue;
    }
    if (!map.has(row.fixture_id)) {
      map.set(row.fixture_id, row.created_at);
    }
  }

  return map;
}

export async function readLatestPrematchInsight(
  fixtureUuid: string
): Promise<AiInsightRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_insights")
    .select("*")
    .eq("fixture_id", fixtureUuid)
    .eq("type", "PREMATCH")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read latest prematch insight: ${error.message}`);
  }

  return data;
}

export async function readInsightByContextHash(
  fixtureUuid: string,
  type: Database["public"]["Enums"]["ai_insight_type"],
  contextHash: string
): Promise<AiInsightRow | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_insights")
    .select("*")
    .eq("fixture_id", fixtureUuid)
    .eq("type", type)
    .eq("context_hash", contextHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read AI insight: ${error.message}`);
  }

  return data;
}

export async function insertAiInsight(input: {
  fixtureUuid: string;
  predictionId: string | null;
  contextHash: string;
  openaiModel: string;
  promptVersion: string;
  payload: AIInsightPayload;
  rawOutput: Json;
  tokensInput: number | null;
  tokensOutput: number | null;
  costUsd: number | null;
  type?: Database["public"]["Enums"]["ai_insight_type"];
}): Promise<AiInsightRow> {
  const client = createAdminClient();
  const insightType = input.type ?? "PREMATCH";
  const { data, error } = await client
    .from("ai_insights")
    .insert({
      fixture_id: input.fixtureUuid,
      prediction_id: input.predictionId,
      type: insightType,
      context_hash: input.contextHash,
      openai_model: input.openaiModel,
      prompt_version: input.promptVersion,
      summary: input.payload.summary,
      advantage: input.payload.advantage,
      win_outcome: input.payload.winOutcome,
      win_probabilities: input.payload.winProbabilities as unknown as Json,
      expected_goals_range: formatExpectedGoalsRange(
        input.payload.expectedGoalsRange
      ),
      weaker_team_scoring_chance: input.payload.weakerTeamScoringChance,
      confidence: input.payload.confidence,
      key_factors: input.payload.keyFactors as unknown as Json,
      scenarios: input.payload.scenarios as unknown as Json,
      commentary: input.payload.commentary,
      data_timestamp: input.payload.dataTimestamp,
      data_quality: input.payload.dataQuality,
      raw_output: input.rawOutput,
      validated: true,
      tokens_input: input.tokensInput,
      tokens_output: input.tokensOutput,
      cost_usd: input.costUsd,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to insert AI insight: ${error.message}`);
  }

  return data;
}

function utcDayString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function readAiUsage(
  userId: string,
  usageDay = utcDayString()
): Promise<number> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_usage")
    .select("ai_predictions_count")
    .eq("user_id", userId)
    .eq("usage_day", usageDay)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read AI usage: ${error.message}`);
  }

  return data?.ai_predictions_count ?? 0;
}

export async function incrementAiUsage(userId: string): Promise<number> {
  const client = createAdminClient();
  const usageDay = utcDayString();
  const existing = await readAiUsage(userId, usageDay);

  if (existing === 0) {
    const { data, error } = await client
      .from("ai_usage")
      .insert({
        user_id: userId,
        usage_day: usageDay,
        ai_predictions_count: 1,
        ai_generations_count: 1,
      })
      .select("ai_predictions_count")
      .single();

    if (error) {
      throw new Error(`Failed to insert AI usage: ${error.message}`);
    }

    return data.ai_predictions_count;
  }

  const nextCount = existing + 1;
  const { data, error } = await client
    .from("ai_usage")
    .update({
      ai_predictions_count: nextCount,
      ai_generations_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("usage_day", usageDay)
    .select("ai_predictions_count")
    .single();

  if (error) {
    throw new Error(`Failed to update AI usage: ${error.message}`);
  }

  return data.ai_predictions_count;
}

export async function setAiUsageCount(
  userId: string,
  count: number,
  usageDay = utcDayString()
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from("ai_usage").upsert(
    {
      user_id: userId,
      usage_day: usageDay,
      ai_predictions_count: count,
      ai_generations_count: count,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_day" }
  );

  if (error) {
    throw new Error(`Failed to set AI usage: ${error.message}`);
  }
}

export { utcDayString as getUtcUsageDay };
