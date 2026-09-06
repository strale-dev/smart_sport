import { listSeasonsByLeague } from "@/lib/api-football/endpoints/leagues";
import { INGESTION_LEAGUE_PROVIDER_IDS } from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import { ingestFixtureFromRaw } from "@/lib/ingestion/upsert";
import { hasApiFootballConfig } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RawApiFootballFixture } from "@/lib/api-football/types";

const TERMINAL_STATUSES = new Set(["FT", "AET", "PEN"]);
const MAX_SEASONS = 3;

async function fetchRawFixturesByLeagueSeason(
  leagueId: number,
  season: number
): Promise<RawApiFootballFixture[]> {
  const { apiFootballFetchResponse } =
    await import("@/lib/api-football/client");
  return apiFootballFetchResponse<RawApiFootballFixture>("/fixtures", {
    league: leagueId,
    season,
  });
}

export async function backfillHistoricalFixtures(): Promise<{
  leaguesProcessed: number;
  apiRequests: number;
  fixturesUpserted: number;
  terminalFixtures: number;
}> {
  const client = createAdminClient();
  let apiRequests = 0;
  let fixturesUpserted = 0;
  let terminalFixtures = 0;

  for (const leagueProviderId of INGESTION_LEAGUE_PROVIDER_IDS) {
    const seasons = await listSeasonsByLeague(leagueProviderId);
    apiRequests += 1;
    await throttleProviderRequest();

    const targetSeasons = seasons
      .sort((left, right) => right.year - left.year)
      .slice(0, MAX_SEASONS);

    for (const season of targetSeasons) {
      if (apiRequests > 0) {
        await throttleProviderRequest();
      }

      const rawFixtures = await fetchRawFixturesByLeagueSeason(
        leagueProviderId,
        season.year
      );
      apiRequests += 1;

      for (const raw of rawFixtures) {
        if (!TERMINAL_STATUSES.has(raw.fixture.status.short)) {
          continue;
        }

        await ingestFixtureFromRaw(client, raw);
        fixturesUpserted += 1;
        terminalFixtures += 1;
      }
    }
  }

  return {
    leaguesProcessed: INGESTION_LEAGUE_PROVIDER_IDS.length,
    apiRequests,
    fixturesUpserted,
    terminalFixtures,
  };
}

async function main() {
  if (!hasApiFootballConfig(process.env)) {
    console.error("Missing API_FOOTBALL_KEY.");
    process.exit(1);
  }

  console.log("Backfilling historical fixtures for allowlist leagues...");
  const result = await backfillHistoricalFixtures();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Historical fixture backfill failed:", error);
  process.exit(1);
});
