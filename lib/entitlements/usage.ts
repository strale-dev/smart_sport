import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

import { parseLastLiveAiAtFromJson } from "@/lib/entitlements/merge-usage";
import {
  incrementRedisUsageCounters,
  readMergedUsageRow,
  readRedisUsageRow,
} from "@/lib/entitlements/redis-usage";

export type AiUsageRow = {
  ai_predictions_count: number;
  ai_deep_analyses_count: number;
  ai_generations_count: number;
  live_ai_matches: string[];
  last_live_ai_at: Record<string, string>;
};

function utcDayString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function emptyUsageRow(): AiUsageRow {
  return {
    ai_predictions_count: 0,
    ai_deep_analyses_count: 0,
    ai_generations_count: 0,
    live_ai_matches: [],
    last_live_ai_at: {},
  };
}

function mapPgRow(data: {
  ai_predictions_count: number;
  ai_deep_analyses_count: number;
  ai_generations_count: number;
  live_ai_matches: string[] | null;
  last_live_ai_at: Json;
}): AiUsageRow {
  return {
    ai_predictions_count: data.ai_predictions_count,
    ai_deep_analyses_count: data.ai_deep_analyses_count,
    ai_generations_count: data.ai_generations_count,
    live_ai_matches: data.live_ai_matches ?? [],
    last_live_ai_at: parseLastLiveAiAtFromJson(data.last_live_ai_at),
  };
}

export async function readPostgresUsageRow(
  userId: string,
  usageDay = utcDayString()
): Promise<AiUsageRow> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ai_usage")
    .select(
      "ai_predictions_count, ai_deep_analyses_count, ai_generations_count, live_ai_matches, last_live_ai_at"
    )
    .eq("user_id", userId)
    .eq("usage_day", usageDay)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read AI usage: ${error.message}`);
  }

  if (!data) {
    return emptyUsageRow();
  }

  return mapPgRow(data);
}

export async function readAiUsageRow(
  userId: string,
  usageDay = utcDayString()
): Promise<AiUsageRow> {
  const postgresRow = await readPostgresUsageRow(userId, usageDay);
  return readMergedUsageRow(userId, usageDay, postgresRow);
}

export type UsageIncrement = {
  predictions?: number;
  deepAnalyses?: number;
  generations?: number;
  liveFixtureUuid?: string;
};

async function persistIncrementToPostgres(
  userId: string,
  increment: UsageIncrement,
  usageDay: string
): Promise<AiUsageRow> {
  const client = createAdminClient();
  const touchAt =
    increment.liveFixtureUuid != null ? new Date().toISOString() : null;

  const { data, error } = await client.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_usage_day: usageDay,
    p_predictions: increment.predictions ?? 0,
    p_deep_analyses: increment.deepAnalyses ?? 0,
    p_generations: increment.generations ?? 0,
    p_live_fixture_uuid: increment.liveFixtureUuid ?? null,
    p_live_touch_at: touchAt,
  });

  if (error) {
    throw new Error(`Failed to increment AI usage: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to increment AI usage: empty response");
  }

  return mapPgRow(data);
}

export async function incrementAiUsageCounters(
  userId: string,
  increment: UsageIncrement,
  usageDay = utcDayString()
): Promise<AiUsageRow> {
  await incrementRedisUsageCounters(userId, increment, usageDay);
  const pgRow = await persistIncrementToPostgres(userId, increment, usageDay);
  const redisRow = await readRedisUsageRow(userId, usageDay);
  if (!redisRow) {
    return pgRow;
  }

  return readMergedUsageRow(userId, usageDay, pgRow);
}

export { utcDayString as getUtcUsageDay };
