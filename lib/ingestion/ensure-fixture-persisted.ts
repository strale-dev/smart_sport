import { getFixtureByIdWithRaw } from "@/lib/api-football/endpoints/fixtures";
import { safeOptionalProviderFetch } from "@/lib/api-football/safe-call";
import { isLeagueInAllowlist } from "@/lib/ingestion/config";
import { getFixtureUuidByProviderId } from "@/lib/ingestion/match-details-upsert";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Match pages can render a fixture from provider/cache before a Postgres row exists.
 * Ingestion (events, stats, H2H backfill) requires a fixture UUID — ensure one exists.
 */
export async function ensureFixturePersisted(
  fixtureProviderId: number
): Promise<string | null> {
  const client = createAdminClient();
  const existing = await getFixtureUuidByProviderId(client, fixtureProviderId);
  if (existing) {
    return existing;
  }

  await throttleProviderRequest();
  const payload = await safeOptionalProviderFetch(
    `fixture persist ${fixtureProviderId}`,
    () => getFixtureByIdWithRaw(fixtureProviderId),
    null
  );

  if (!payload?.domain) {
    return null;
  }

  if (!isLeagueInAllowlist(payload.domain.league.externalId)) {
    return null;
  }

  await ingestFixtureFromRaw(client, payload.raw);
  return getFixtureUuidByProviderId(client, fixtureProviderId);
}
