import type { Json } from "@/types/supabase";

import type { AiUsageRow } from "@/lib/entitlements/usage";

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

export function emptyAiUsageRow(): AiUsageRow {
  return {
    ai_predictions_count: 0,
    ai_deep_analyses_count: 0,
    ai_generations_count: 0,
    live_ai_matches: [],
    last_live_ai_at: {},
  };
}

export function mergeAiUsageRows(a: AiUsageRow, b: AiUsageRow): AiUsageRow {
  const matchSet = new Set([...a.live_ai_matches, ...b.live_ai_matches]);
  const last: Record<string, string> = {
    ...a.last_live_ai_at,
    ...b.last_live_ai_at,
  };

  for (const [key, tsA] of Object.entries(a.last_live_ai_at)) {
    const tsB = b.last_live_ai_at[key];
    if (tsB) {
      last[key] =
        new Date(tsA).getTime() >= new Date(tsB).getTime() ? tsA : tsB;
    }
  }

  return {
    ai_predictions_count: Math.max(
      a.ai_predictions_count,
      b.ai_predictions_count
    ),
    ai_deep_analyses_count: Math.max(
      a.ai_deep_analyses_count,
      b.ai_deep_analyses_count
    ),
    ai_generations_count: Math.max(
      a.ai_generations_count,
      b.ai_generations_count
    ),
    live_ai_matches: [...matchSet],
    last_live_ai_at: last,
  };
}

export function parseLastLiveAiAtFromJson(value: Json): Record<string, string> {
  return parseLastLiveAiAt(value);
}
