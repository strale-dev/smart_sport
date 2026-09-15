import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

import { mergeAiUsageRows } from "@/lib/entitlements/merge-usage";
import {
  listActiveUsageUserIds,
  readRedisUsageRow,
  rowToMergePayload,
} from "@/lib/entitlements/redis-usage";
import { readPostgresUsageRow } from "@/lib/entitlements/usage";
import { getUtcUsageDay } from "@/lib/entitlements/usage";

function usageDaysToReconcile(): string[] {
  const today = getUtcUsageDay();
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = getUtcUsageDay(yesterdayDate);
  return yesterday === today ? [today] : [today, yesterday];
}

export async function reconcileAiUsageForDay(
  usageDay: string
): Promise<{ mergedUsers: number }> {
  const userIds = await listActiveUsageUserIds(usageDay);
  let mergedUsers = 0;

  for (const userId of userIds) {
    const redisRow = await readRedisUsageRow(userId, usageDay);
    if (!redisRow) {
      continue;
    }

    const pgRow = await readPostgresUsageRow(userId, usageDay);
    const merged = mergeAiUsageRows(pgRow, redisRow);
    const payload = rowToMergePayload(merged);

    const client = createAdminClient();
    const { error } = await client.rpc("merge_ai_usage_from_redis", {
      p_user_id: userId,
      p_usage_day: usageDay,
      p_predictions: payload.predictions,
      p_deep_analyses: payload.deepAnalyses,
      p_generations: payload.generations,
      p_live_ai_matches: payload.liveMatches,
      p_last_live_ai_at: payload.lastLiveAt as Json,
    });

    if (error) {
      throw new Error(
        `Failed to reconcile AI usage for ${userId}: ${error.message}`
      );
    }

    mergedUsers += 1;
  }

  return { mergedUsers };
}

export async function reconcileAiUsage(): Promise<{
  days: string[];
  mergedUsers: number;
}> {
  const days = usageDaysToReconcile();
  let mergedUsers = 0;

  for (const day of days) {
    const result = await reconcileAiUsageForDay(day);
    mergedUsers += result.mergedUsers;
  }

  return { days, mergedUsers };
}
