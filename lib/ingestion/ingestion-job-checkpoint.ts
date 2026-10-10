import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

export const SYNC_FIXTURES_FUTURE_JOB = "sync-fixtures-future";

export async function getJobCheckpoint(
  jobName: string
): Promise<Record<string, unknown> | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("ingestion_job_checkpoints")
    .select("cursor")
    .eq("job_name", jobName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read job checkpoint: ${error.message}`);
  }

  if (!data?.cursor || typeof data.cursor !== "object") {
    return null;
  }

  return data.cursor as Record<string, unknown>;
}

export async function upsertJobCheckpoint(
  jobName: string,
  cursor: Record<string, unknown>
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from("ingestion_job_checkpoints").upsert(
    {
      job_name: jobName,
      cursor: cursor as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "job_name" }
  );

  if (error) {
    throw new Error(`Failed to upsert job checkpoint: ${error.message}`);
  }
}

export async function clearJobCheckpoint(jobName: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client
    .from("ingestion_job_checkpoints")
    .delete()
    .eq("job_name", jobName);

  if (error) {
    throw new Error(`Failed to clear job checkpoint: ${error.message}`);
  }
}
