import { competitionSupportsStandings } from "@/lib/competitions/capabilities";
import { findCompetition, getCompetitionTier } from "@/lib/competitions/index";
import { getStandings } from "@/lib/api-football/endpoints/leagues";
import { getIngestionConfig } from "@/lib/ingestion/config";
import {
  pickStandingsLeagueIds,
  rankStandingsCandidates,
  resolveStandingsMaxApiRequests,
  shouldRunNonCriticalIngestion,
  type StandingsScheduleInput,
} from "@/lib/ingestion/schedule";
import { throttleProviderRequest } from "@/lib/ingestion/throttle";
import {
  getCurrentSeasonForLeague,
  getLeagueUuidByProviderId,
  isStandingsFreshForLeague,
  readStandingsScheduleFixtureCountsByLeagueIds,
  upsertStandingRow,
  upsertTeamRef,
} from "@/lib/ingestion/upsert";
import { writeCachedValue } from "@/lib/redis/cache";
import { CACHE_TTL, providerStandingsKey } from "@/lib/redis/keys";
import { getRedis } from "@/lib/redis/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ingestStandingsForLeagueSeason(
  leagueProviderId: number,
  seasonYear: number
): Promise<void> {
  if (!competitionSupportsStandings(findCompetition(leagueProviderId))) {
    return;
  }

  const client = createAdminClient();
  const leagueId = await getLeagueUuidByProviderId(client, leagueProviderId);
  if (!leagueId) {
    return;
  }

  const { data: season, error: seasonError } = await client
    .from("seasons")
    .select("id")
    .eq("league_id", leagueId)
    .eq("year", seasonYear)
    .maybeSingle();

  if (seasonError) {
    throw new Error(
      `Failed to resolve season ${seasonYear} for league ${leagueProviderId}: ${seasonError.message}`
    );
  }

  if (!season) {
    return;
  }

  const { count, error: countError } = await client
    .from("standings")
    .select("*", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .eq("season_id", season.id);

  if (countError) {
    throw new Error(`Failed to count standings rows: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    return;
  }

  await throttleProviderRequest();
  const groups = await getStandings(leagueProviderId, seasonYear);

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
    }
  }

  if (groups.length > 0) {
    await writeCachedValue(
      providerStandingsKey(leagueProviderId, seasonYear),
      groups,
      CACHE_TTL.standingsStale
    );
  }
}

export type SyncStandingsResult = {
  ok: boolean;
  job: string;
  stats: {
    leaguesRequested: number;
    leaguesSkipped: number;
    apiRequests: number;
    rowsUpserted: number;
    nonCriticalSkipped?: boolean;
    schedule?: {
      maxApiRequests: number;
      staleCandidates: number;
      rankedEligible: number;
      selected: number;
      cappedByQuota: number;
      topScores: Array<{ providerId: number; score: number }>;
    };
  };
};

export async function syncStandings(): Promise<SyncStandingsResult> {
  const config = getIngestionConfig();
  const client = createAdminClient();
  const syncedAt = new Date().toISOString();

  let leaguesSkipped = 0;
  let apiRequests = 0;
  let rowsUpserted = 0;

  if (!(await shouldRunNonCriticalIngestion())) {
    return {
      ok: true,
      job: "sync-standings",
      stats: {
        leaguesRequested: config.leagueProviderIds.length,
        leaguesSkipped: config.leagueProviderIds.length,
        apiRequests: 0,
        rowsUpserted: 0,
        nonCriticalSkipped: true,
      },
    };
  }

  const scheduleCandidates: StandingsScheduleInput[] = [];
  const staleLeagueIds: string[] = [];
  const leagueUuidByProviderId = new Map<number, string>();

  for (const leagueProviderId of config.leagueProviderIds) {
    const leagueId = await getLeagueUuidByProviderId(client, leagueProviderId);
    if (!leagueId) {
      leaguesSkipped += 1;
      continue;
    }

    const standingsStale = !(await isStandingsFreshForLeague(
      client,
      leagueId,
      config.standingsFreshnessHours
    ));

    if (!standingsStale) {
      leaguesSkipped += 1;
      continue;
    }

    const season = await getCurrentSeasonForLeague(client, leagueId);
    if (!season) {
      leaguesSkipped += 1;
      continue;
    }

    staleLeagueIds.push(leagueId);
    leagueUuidByProviderId.set(leagueProviderId, leagueId);
    scheduleCandidates.push({
      leagueProviderId,
      tier: getCompetitionTier(leagueProviderId),
      upcomingFixtureCount: 0,
      liveOrTodayFixtureCount: 0,
      standingsStale: true,
    });
  }

  const fixtureCountsByLeague =
    await readStandingsScheduleFixtureCountsByLeagueIds(client, staleLeagueIds);

  for (const candidate of scheduleCandidates) {
    const leagueId = leagueUuidByProviderId.get(candidate.leagueProviderId);
    if (!leagueId) {
      continue;
    }

    const counts = fixtureCountsByLeague.get(leagueId);
    candidate.upcomingFixtureCount = counts?.upcomingFixtureCount ?? 0;
    candidate.liveOrTodayFixtureCount = counts?.liveOrTodayFixtureCount ?? 0;
  }

  const maxApiRequests = resolveStandingsMaxApiRequests();
  const ranked = rankStandingsCandidates(scheduleCandidates);
  const selectedLeagueIds = pickStandingsLeagueIds(scheduleCandidates, {
    maxApiRequests,
  });
  leaguesSkipped += scheduleCandidates.length - selectedLeagueIds.length;

  const scheduleStats = {
    maxApiRequests,
    staleCandidates: scheduleCandidates.length,
    rankedEligible: ranked.length,
    selected: selectedLeagueIds.length,
    cappedByQuota: Math.max(0, ranked.length - selectedLeagueIds.length),
    topScores: ranked.slice(0, 5),
  };

  for (const leagueProviderId of selectedLeagueIds) {
    const leagueId = await getLeagueUuidByProviderId(client, leagueProviderId);
    if (!leagueId) {
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
      schedule: scheduleStats,
    },
  };
}
