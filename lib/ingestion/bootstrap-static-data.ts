import { listLeagues } from "@/lib/api-football/endpoints/leagues";
import { getIngestionConfig } from "@/lib/ingestion/config";
import {
  bootstrapLeaguesAlreadyPresent,
  upsertCountry,
  upsertLeague,
  upsertSeason,
} from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

export type BootstrapStaticDataResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  apiRequests: number;
  leaguesUpserted: number;
  seasonsUpserted: number;
};

export async function bootstrapStaticData(): Promise<BootstrapStaticDataResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();

  if (await bootstrapLeaguesAlreadyPresent(client, config.leagueProviderIds)) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Allowlist leagues and current seasons already exist in Postgres.",
      apiRequests: 0,
      leaguesUpserted: 0,
      seasonsUpserted: 0,
    };
  }

  const allLeagues = await listLeagues();
  const selected = allLeagues.filter((entry) =>
    config.leagueProviderIds.includes(entry.domain.league.externalId)
  );

  let leaguesUpserted = 0;
  let seasonsUpserted = 0;

  for (const entry of selected) {
    const countryId = await upsertCountry(client, {
      externalId: entry.raw.country.code,
      code: entry.raw.country.code,
      name: entry.raw.country.name,
      flagUrl: entry.raw.country.flag,
    });

    const leagueId = await upsertLeague(client, entry.domain.league, countryId);
    leaguesUpserted += 1;

    for (const season of entry.domain.seasons) {
      await upsertSeason(client, leagueId, season, season);
      seasonsUpserted += 1;
    }
  }

  return {
    ok: true,
    skipped: false,
    apiRequests: 1,
    leaguesUpserted,
    seasonsUpserted,
  };
}
