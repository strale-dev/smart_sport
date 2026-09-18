import { ingestLineupsFromProvider } from "@/lib/ingestion/ingest-lineups";
import { createAdminClient } from "@/lib/supabase/admin";

const TERMINAL_STATUSES = ["FT", "AET", "PEN"] as const;
const LOOKBACK_DAYS = 21;

async function listFinishedFixturesMissingLineups(): Promise<number[]> {
  const client = createAdminClient();
  const cutoff = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await client
    .from("fixtures")
    .select("provider_id, lineups (id)")
    .in("status", [...TERMINAL_STATUSES])
    .gte("kickoff_at", cutoff);

  if (error) {
    throw new Error(`Failed to scan fixtures for lineups: ${error.message}`);
  }

  return (data ?? [])
    .filter((row) => !row.lineups || row.lineups.length === 0)
    .map((row) => row.provider_id)
    .sort((left, right) => left - right);
}

async function main(): Promise<void> {
  const fixtureIds = await listFinishedFixturesMissingLineups();

  if (fixtureIds.length === 0) {
    console.log("[repair-lineups] no finished fixtures missing lineups");
    return;
  }

  console.log(`[repair-lineups] ${fixtureIds.length} fixture(s) to repair`);

  let repaired = 0;
  let empty = 0;
  let failed = 0;

  for (const fixtureId of fixtureIds) {
    try {
      const result = await ingestLineupsFromProvider(fixtureId);
      if (!result.ok) {
        failed += 1;
        console.warn(
          `[repair-lineups] ${fixtureId} failed: ${result.reason ?? "unknown"}`
        );
        continue;
      }

      if (result.stats.lineups > 0) {
        repaired += 1;
        console.log(
          `[repair-lineups] ${fixtureId}: ${result.stats.lineups} lineups`
        );
      } else {
        empty += 1;
        console.log(`[repair-lineups] ${fixtureId}: provider returned none`);
      }
    } catch (error) {
      failed += 1;
      console.warn(`[repair-lineups] ${fixtureId} threw`, error);
    }
  }

  console.log(
    `[repair-lineups] done — repaired ${repaired}, empty ${empty}, failed ${failed}`
  );
}

void main();
