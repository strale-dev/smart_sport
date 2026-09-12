import { readRecentLiveInsightTimestamps } from "@/lib/ai/db";
import type { LiveFixtureRow } from "@/lib/live/live-fixture-row";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

export type { LiveFixtureRow } from "@/lib/live/live-fixture-row";
export {
  isAiUpdatedMarkerFresh,
  AI_UPDATED_MARKER_FRESH_MS,
} from "@/lib/live/ai-updated-marker";

export async function resolveFixtureUuidsByExternalIds(
  externalIds: number[]
): Promise<Map<number, string>> {
  if (externalIds.length === 0) {
    return new Map();
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id, provider_id")
    .in("provider_id", externalIds);

  if (error) {
    throw new Error(`Failed to resolve fixture UUIDs: ${error.message}`);
  }

  const map = new Map<number, string>();
  for (const row of data ?? []) {
    map.set(row.provider_id, row.id);
  }

  return map;
}

export async function attachAiUpdatedAtToFixtures(
  fixtures: Fixture[],
  now = new Date()
): Promise<LiveFixtureRow[]> {
  if (fixtures.length === 0) {
    return [];
  }

  const externalToUuid = await resolveFixtureUuidsByExternalIds(
    fixtures.map((fixture) => fixture.externalId)
  );
  const uuids = [...externalToUuid.values()];
  const timestampsByUuid = await readRecentLiveInsightTimestamps(uuids, now);

  return fixtures.map((fixture) => {
    const uuid = externalToUuid.get(fixture.externalId);
    const aiUpdatedAt =
      uuid != null ? (timestampsByUuid.get(uuid) ?? null) : null;

    return { ...fixture, aiUpdatedAt };
  });
}

export async function attachAiUpdatedAtToFixturesSafe(
  fixtures: Fixture[],
  now = new Date()
): Promise<LiveFixtureRow[]> {
  try {
    return await attachAiUpdatedAtToFixtures(fixtures, now);
  } catch (error) {
    console.warn(
      "[live] AI updated timestamps unavailable, continuing without markers",
      error
    );
    return fixtures.map((fixture) => ({ ...fixture, aiUpdatedAt: null }));
  }
}
