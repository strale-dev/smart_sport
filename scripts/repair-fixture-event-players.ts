import { ingestMatchDetailsFromProvider } from "@/lib/ingestion/ingest-match-details";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Repairs fixtures whose events were ingested without player linkage, which the
 * timeline renders as anonymous rows. Safe to re-run: fixtures that already have
 * linked events are skipped.
 */
async function listFixturesMissingEventPlayers(): Promise<number[]> {
  const client = createAdminClient();

  const { data, error } = await client
    .from("fixture_events")
    .select("player_id, fixture:fixtures!inner (provider_id)");

  if (error) {
    throw new Error(`Failed to scan fixture events: ${error.message}`);
  }

  const totalByFixture = new Map<number, number>();
  const linkedByFixture = new Map<number, number>();

  for (const row of data ?? []) {
    const providerId = row.fixture?.provider_id;
    if (providerId == null) {
      continue;
    }

    totalByFixture.set(providerId, (totalByFixture.get(providerId) ?? 0) + 1);
    if (row.player_id != null) {
      linkedByFixture.set(
        providerId,
        (linkedByFixture.get(providerId) ?? 0) + 1
      );
    }
  }

  return [...totalByFixture.keys()]
    .filter((providerId) => (linkedByFixture.get(providerId) ?? 0) === 0)
    .sort((left, right) => left - right);
}

async function main(): Promise<void> {
  const fixtureIds = await listFixturesMissingEventPlayers();

  if (fixtureIds.length === 0) {
    console.log("[repair] no fixtures with unlinked events");
    return;
  }

  console.log(`[repair] ${fixtureIds.length} fixture(s) to repair`);

  let repaired = 0;
  let failed = 0;

  for (const fixtureId of fixtureIds) {
    const result = await ingestMatchDetailsFromProvider(fixtureId, {
      skipLineups: true,
    });

    if (result.ok) {
      repaired += 1;
      console.log(
        `[repair] ${fixtureId}: ${result.stats.events} events, ${result.stats.playerPerformances} performances`
      );
    } else {
      failed += 1;
      console.warn(
        `[repair] ${fixtureId} failed: ${result.reason ?? "unknown"}`
      );
    }
  }

  console.log(`[repair] done — repaired ${repaired}, failed ${failed}`);
}

void main();
