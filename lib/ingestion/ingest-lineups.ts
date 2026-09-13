import { getFixtureLineups as getFixtureLineupsEndpoint } from "@/lib/api-football/endpoints/fixtures";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertLineups,
} from "@/lib/ingestion/match-details-upsert";
import { getRedis } from "@/lib/redis/client";
import { providerFixtureLineupsKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestLineupsResult = {
  ok: boolean;
  fixtureProviderId: number;
  stats: {
    lineups: number;
    apiRequests: number;
  };
  reason?: string;
};

export async function ingestLineupsFromProvider(
  fixtureProviderId: number
): Promise<IngestLineupsResult> {
  const client = createAdminClient();
  const fixtureId = await getFixtureUuidByProviderId(client, fixtureProviderId);

  if (!fixtureId) {
    return {
      ok: false,
      fixtureProviderId,
      stats: { lineups: 0, apiRequests: 0 },
      reason: "Fixture not found in Postgres",
    };
  }

  await throttleProviderRequest();
  const lineups = await getFixtureLineupsEndpoint(fixtureProviderId);

  const lineupsCount = await upsertLineups(client, fixtureId, lineups);

  const syncedAt = new Date().toISOString();
  const redis = getRedis();

  if (redis) {
    await redis.set(
      providerFixtureLineupsKey(fixtureProviderId),
      { value: lineups, cachedAt: syncedAt },
      { ex: 86_400 }
    );
  }

  return {
    ok: true,
    fixtureProviderId,
    stats: {
      lineups: lineupsCount,
      apiRequests: 1,
    },
  };
}
