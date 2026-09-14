import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcUsageDay } from "@/lib/entitlements/usage";

function yesterdayUtcDay(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return getUtcUsageDay(date);
}

export async function cleanupAiUsageRows(): Promise<{
  deleted: number;
  usageDay: string;
}> {
  const usageDay = yesterdayUtcDay();
  const client = createAdminClient();

  const { data, error } = await client
    .from("ai_usage")
    .delete()
    .lt("usage_day", usageDay)
    .select("id");

  if (error) {
    throw new Error(`Failed to cleanup AI usage: ${error.message}`);
  }

  return {
    deleted: data?.length ?? 0,
    usageDay,
  };
}
