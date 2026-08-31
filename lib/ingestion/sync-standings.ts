import { getStandings } from "@/lib/api-football/endpoints/leagues";
import { getIngestionConfig } from "@/lib/ingestion/config";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getCurrentSeasonForLeague,
  getLeagueUuidByProviderId,
  isStandingsFreshForLeague,
  upsertStandingRow,
  upsertTeamRef,
} from "@/lib/ingestion/upsert";
import { getRedis } from "@/lib/redis/client";
import { providerStandingsKey } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncStandingsResult = {
  ok: boolean;
  job: string;
  stats: {
    leaguesRequested: number;
    leaguesSkipped: number;
    apiRequests: number;
    rowsUpserted: number;
  };
};

export async function syncStandings(): Promise<SyncStandingsResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const syncedAt = new Date().toISOString();

  let leaguesSkipped = 0;
  let apiRequests = 0;
  let rowsUpserted = 0;

  for (const leagueProviderId of config.leagueProviderIds) {
    const leagueId = await getLeagueUuidByProviderId(client, leagueProviderId);
    if (!leagueId) {
      leaguesSkipped += 1;
      continue;
    }

    if (
      await isStandingsFreshForLeague(
        client,
        leagueId,
        config.standingsFreshnessHours
      )
    ) {
      leaguesSkipped += 1;
      continue;
    }

    const season = await getCurrentSeasonForLeague(client, leagueId);
    if (!season) {
      leaguesSkipped += 1;
      continue;
    }

    if (apiRequests > 0) {
      await throttleProviderRequest();
    }

    const groups = await getStandings(leagueProviderId, season.year);
    apiRequests += 1;

    for (const group of groups) {
      for (const row of group.rows) {
        const teamId = await upsertTeamRef(client, row.team);
        await upsertStandingRow(
          client,
          leagueId,
          season.id,
          teamId,
          {
            ...row,
            groupName: row.groupName ?? group.groupName,
          },
          row
        );
        rowsUpserted += 1;
      }
    }

    const redis = getRedis();
    if (redis) {
      await redis.set(
        providerStandingsKey(leagueProviderId, season.year),
        {
          value: groups,
          cachedAt: syncedAt,
        },
        { ex: 86_400 }
      );
    }
  }

  return {
    ok: true,
    job: "sync-standings",
    stats: {
      leaguesRequested: config.leagueProviderIds.length,
      leaguesSkipped,
      apiRequests,
      rowsUpserted,
    },
  };
}
