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

export type SyncLeagueSeasonFixturesBoundedOptions =
  SyncLeagueSeasonFixturesOptions & {
    startLeagueIndex?: number;
    maxLeagues?: number;
    budgetExceeded?: () => boolean;
  };

export type SyncLeagueSeasonFixturesBoundedResult =
  SyncLeagueSeasonFixturesResult & {
    nextLeagueIndex: number;
    stoppedForTimeBudget: boolean;
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

export async function syncLeagueSeasonFixturesBounded(
  options: SyncLeagueSeasonFixturesBoundedOptions
): Promise<SyncLeagueSeasonFixturesBoundedResult> {
  const leagueProviderIds =
    options.leagueProviderIds ?? resolveIngestionLeagueProviderIds();
  const startIndex = options.startLeagueIndex ?? 0;
  const maxLeagues = options.maxLeagues ?? leagueProviderIds.length;
  const budgetExceeded = options.budgetExceeded ?? (() => false);

  const client = createAdminClient();
  const syncedAt = (options.anchor ?? new Date()).toISOString();

  let leaguesSynced = 0;
  let fixturesUpserted = 0;
  let apiRequests = 0;
  let stoppedForTimeBudget = false;
  let index = startIndex;

  for (
    ;
    index < leagueProviderIds.length && leaguesSynced < maxLeagues;
    index++
  ) {
    if (budgetExceeded()) {
      stoppedForTimeBudget = true;
      break;
    }

    const leagueProviderId = leagueProviderIds[index]!;
    await throttleProviderRequest();
    const seasons = await listSeasonsByLeague(leagueProviderId);
    apiRequests += 1;

    const seasonYears = pickSeasonYears(seasons, options.mode);
    if (seasonYears.length === 0) {
      leaguesSynced += 1;
      continue;
    }

    for (const seasonYear of seasonYears) {
      if (budgetExceeded()) {
        stoppedForTimeBudget = true;
        break;
      }

      let pageRequests = 0;
      const rawFixtures =
        await apiFootballFetchAllPagesResponse<RawApiFootballFixture>(
          "/fixtures",
          { league: leagueProviderId, season: seasonYear },
          {
            onAfterPage: async () => {
              pageRequests += 1;
              await throttleProviderRequest();
              if (budgetExceeded()) {
                stoppedForTimeBudget = true;
              }
            },
          }
        );
      apiRequests += pageRequests > 0 ? pageRequests : 1;

      if (stoppedForTimeBudget) {
        break;
      }

      for (const raw of rawFixtures) {
        if (budgetExceeded()) {
          stoppedForTimeBudget = true;
          break;
        }
        await ingestFixtureFromRaw(client, raw, syncedAt);
        fixturesUpserted += 1;
      }

      if (stoppedForTimeBudget) {
        break;
      }
    }

    if (stoppedForTimeBudget) {
      break;
    }

    leaguesSynced += 1;
  }

  return {
    leaguesSynced,
    fixturesUpserted,
    apiRequests,
    nextLeagueIndex: index,
    stoppedForTimeBudget,
  };
}

export async function syncLeagueSeasonFixtures(
  options: SyncLeagueSeasonFixturesOptions
): Promise<SyncLeagueSeasonFixturesResult> {
  const result = await syncLeagueSeasonFixturesBounded({
    ...options,
    startLeagueIndex: 0,
    maxLeagues: Number.MAX_SAFE_INTEGER,
  });

  return {
    leaguesSynced: result.leaguesSynced,
    fixturesUpserted: result.fixturesUpserted,
    apiRequests: result.apiRequests,
  };
}
