import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

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

function parseLastLiveAiAt(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      out[key] = raw;
    }
  }
  return out;
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

export async function readAiUsageRow(
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

  return {
    ai_predictions_count: data.ai_predictions_count,
    ai_deep_analyses_count: data.ai_deep_analyses_count,
    ai_generations_count: data.ai_generations_count,
    live_ai_matches: data.live_ai_matches ?? [],
    last_live_ai_at: parseLastLiveAiAt(data.last_live_ai_at),
  };
}

async function ensureUsageRow(userId: string, usageDay: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from("ai_usage").upsert(
    {
      user_id: userId,
      usage_day: usageDay,
      ai_predictions_count: 0,
      ai_deep_analyses_count: 0,
      ai_generations_count: 0,
      live_ai_matches: [],
      last_live_ai_at: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_day", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Failed to ensure AI usage row: ${error.message}`);
  }
}

export async function writeAiUsageRow(
  userId: string,
  row: AiUsageRow,
  usageDay = utcDayString()
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from("ai_usage").upsert(
    {
      user_id: userId,
      usage_day: usageDay,
      ai_predictions_count: row.ai_predictions_count,
      ai_deep_analyses_count: row.ai_deep_analyses_count,
      ai_generations_count: row.ai_generations_count,
      live_ai_matches: row.live_ai_matches,
      last_live_ai_at: row.last_live_ai_at as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_day" }
  );

  if (error) {
    throw new Error(`Failed to write AI usage: ${error.message}`);
  }
}

export type UsageIncrement = {
  predictions?: number;
  deepAnalyses?: number;
  generations?: number;
  liveFixtureUuid?: string;
};

export async function incrementAiUsageCounters(
  userId: string,
  increment: UsageIncrement,
  usageDay = utcDayString()
): Promise<AiUsageRow> {
  await ensureUsageRow(userId, usageDay);
  const current = await readAiUsageRow(userId, usageDay);

  const next: AiUsageRow = {
    ai_predictions_count:
      current.ai_predictions_count + (increment.predictions ?? 0),
    ai_deep_analyses_count:
      current.ai_deep_analyses_count + (increment.deepAnalyses ?? 0),
    ai_generations_count:
      current.ai_generations_count + (increment.generations ?? 0),
    live_ai_matches: [...current.live_ai_matches],
    last_live_ai_at: { ...current.last_live_ai_at },
  };

  if (increment.liveFixtureUuid) {
    if (!next.live_ai_matches.includes(increment.liveFixtureUuid)) {
      next.live_ai_matches.push(increment.liveFixtureUuid);
    }
    next.last_live_ai_at[increment.liveFixtureUuid] = new Date().toISOString();
  }

  await writeAiUsageRow(userId, next, usageDay);
  return next;
}

export { utcDayString as getUtcUsageDay };
