import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeTimezone } from "@/lib/datetime/timezone";

export async function readProfileTimezone(userId: string): Promise<string> {
  const client = createAdminClient();

  const { data, error } = await client
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read profile timezone: ${error.message}`);
  }

  return sanitizeTimezone(data?.timezone);
}
