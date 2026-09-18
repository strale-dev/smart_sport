import { getFixtureInjuries } from "@/lib/api-football/endpoints/injuries";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertFixtureSidelined,
} from "@/lib/ingestion/match-details-upsert";
import { writeCachedValue } from "@/lib/redis/cache";
import { CACHE_TTL, providerFixtureSidelinedKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestSidelinedResult = {
  ok: boolean;
  fixtureProviderId: number;
  stats: {
    sidelined: number;
    apiRequests: number;
  };
  reason?: string;
};

export async function ingestFixtureSidelinedFromProvider(
  fixtureProviderId: number
): Promise<IngestSidelinedResult> {
  const client = createAdminClient();
  const fixtureId = await getFixtureUuidByProviderId(client, fixtureProviderId);

  if (!fixtureId) {
    return {
      ok: false,
      fixtureProviderId,
      stats: { sidelined: 0, apiRequests: 0 },
      reason: "Fixture not found in Postgres",
    };
  }

  await throttleProviderRequest();
  const sidelined = await getFixtureInjuries(fixtureProviderId);

  const count = await upsertFixtureSidelined(client, fixtureId, sidelined);

  await writeCachedValue(
    providerFixtureSidelinedKey(fixtureProviderId),
    sidelined,
    CACHE_TTL.fixtureSidelinedStale
  );

  return {
    ok: true,
    fixtureProviderId,
    stats: {
      sidelined: count,
      apiRequests: 1,
    },
  };
}
