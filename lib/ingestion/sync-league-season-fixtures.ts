import { listSeasonsByLeague } from "@/lib/api-football/endpoints/leagues";
import { apiFootballFetchAllPagesResponse } from "@/lib/api-football/client";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import { resolveIngestionLeagueProviderIds } from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncLeagueSeasonFixturesOptions = {
  mode: "current" | "current_and_next";
  anchor?: Date;
  leagueProviderIds?: readonly number[];
};

export type SyncLeagueSeasonFixturesResult = {
  leaguesSynced: number;
  fixturesUpserted: number;
  apiRequests: number;
};

function pickSeasonYears(
  seasons: Awaited<ReturnType<typeof listSeasonsByLeague>>,
  mode: SyncLeagueSeasonFixturesOptions["mode"]
): number[] {
  const sorted = [...seasons].sort((a, b) => b.year - a.year);
  if (sorted.length === 0) {
    return [];
  }

  if (mode === "current") {
    const current = sorted.find((season) => season.isCurrent) ?? sorted[0];
    return current ? [current.year] : [];
  }

  return sorted.slice(0, 2).map((season) => season.year);
}

export async function syncLeagueSeasonFixtures(
  options: SyncLeagueSeasonFixturesOptions
): Promise<SyncLeagueSeasonFixturesResult> {
  const leagueProviderIds =
    options.leagueProviderIds ?? resolveIngestionLeagueProviderIds();
  const client = createAdminClient();
  const syncedAt = (options.anchor ?? new Date()).toISOString();

  let leaguesSynced = 0;
  let fixturesUpserted = 0;
  let apiRequests = 0;

  for (const leagueProviderId of leagueProviderIds) {
    await throttleProviderRequest();
    const seasons = await listSeasonsByLeague(leagueProviderId);
    apiRequests += 1;

    const seasonYears = pickSeasonYears(seasons, options.mode);
    if (seasonYears.length === 0) {
      continue;
    }

    for (const seasonYear of seasonYears) {
      let pageRequests = 0;
      const rawFixtures =
        await apiFootballFetchAllPagesResponse<RawApiFootballFixture>(
          "/fixtures",
          { league: leagueProviderId, season: seasonYear },
          {
            onAfterPage: async () => {
              pageRequests += 1;
              await throttleProviderRequest();
            },
          }
        );
      apiRequests += pageRequests > 0 ? pageRequests : 1;

      for (const raw of rawFixtures) {
        await ingestFixtureFromRaw(client, raw, syncedAt);
        fixturesUpserted += 1;
      }
    }

    leaguesSynced += 1;
  }

  return { leaguesSynced, fixturesUpserted, apiRequests };
}
