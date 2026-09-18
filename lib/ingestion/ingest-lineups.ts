import { getFixtureLineups as getFixtureLineupsEndpoint } from "@/lib/api-football/endpoints/fixtures";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getFixtureUuidByProviderId,
  upsertLineups,
} from "@/lib/ingestion/match-details-upsert";
import { writeCachedValue } from "@/lib/redis/cache";
import { CACHE_TTL, providerFixtureLineupsKey } from "@/lib/redis/keys";
import { ingestFixtureSidelinedFromProvider } from "@/lib/ingestion/ingest-sidelined";
import { dispatchLineupConfirmedNotifications } from "@/lib/notifications/dispatch-lineup-confirmed";
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

  const hasConfirmedLineup = lineups.some((entry) => entry.isConfirmed);
  if (hasConfirmedLineup) {
    await dispatchLineupConfirmedNotifications(fixtureProviderId);
  }

  await writeCachedValue(
    providerFixtureLineupsKey(fixtureProviderId),
    lineups,
    CACHE_TTL.fixtureLineupsStale
  );

  try {
    await ingestFixtureSidelinedFromProvider(fixtureProviderId);
  } catch (error) {
    console.warn(
      `[ingest] sidelined skipped for fixture ${fixtureProviderId}`,
      error
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
