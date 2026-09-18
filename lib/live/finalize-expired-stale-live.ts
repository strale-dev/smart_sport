import { getIngestionConfig } from "@/lib/ingestion/config";
import { logFixtureStatusTransition } from "@/lib/live/fixture-status-log";
import {
  isProviderSyncStale,
  isWithinLiveTailPollWindow,
} from "@/lib/live/live-presentation";
import { addUtcDays, utcDateString } from "@/lib/fixtures/window";
import {
  FIXTURES_PAST_DAYS,
  FIXTURES_WINDOW_DAYS,
} from "@/lib/fixtures/constants";
import { getRedis } from "@/lib/redis/client";
import {
  isLiveFixtureStatus,
  providerFixturesDateKey,
  providerFixturesRangeKey,
} from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FixtureStatus } from "@/types/domain";

const LIVE_DB_STATUSES: FixtureStatus[] = [
  "LIVE",
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
];

export type FinalizeExpiredStaleLiveResult = {
  finalized: number;
};

async function invalidateFixturesListCaches(now: Date): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const today = utcDateString(now);
  const keys = new Set<string>();

  for (
    let offset = -FIXTURES_PAST_DAYS;
    offset <= FIXTURES_WINDOW_DAYS;
    offset++
  ) {
    keys.add(providerFixturesDateKey(addUtcDays(today, offset)));
  }

  const fromDate = addUtcDays(today, -FIXTURES_PAST_DAYS);
  const toDateExclusive = addUtcDays(today, FIXTURES_WINDOW_DAYS + 1);
  keys.add(providerFixturesRangeKey(fromDate, toDateExclusive));

  await Promise.all([...keys].map((key) => redis.del(key)));
}

/**
 * When API revalidation did not run (no viewers / cron gap), close obvious zombie
 * live rows in Postgres so fixtures range reads stay authoritative.
 */
export async function finalizeExpiredStaleLiveFixturesInDb(
  now = new Date()
): Promise<FinalizeExpiredStaleLiveResult> {
  const nowMs = now.getTime();
  const client = createAdminClient();
  const config = getIngestionConfig();

  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return { finalized: 0 };
  }

  const { data: rows, error } = await client
    .from("fixtures")
    .select(
      "provider_id, status, score_home, score_away, ft_home, ft_away, kickoff_at, last_provider_sync_at"
    )
    .in(
      "league_id",
      leagues.map((league) => league.id)
    )
    .in("status", LIVE_DB_STATUSES);

  if (error) {
    throw new Error(`finalize_stale_live_read_failed: ${error.message}`);
  }

  let finalized = 0;
  const syncedAt = now.toISOString();

  for (const row of rows ?? []) {
    if (
      !row.status ||
      !isLiveFixtureStatus(row.status as FixtureStatus) ||
      !row.provider_id
    ) {
      continue;
    }

    const kickoffAt = row.kickoff_at;
    const lastSync = row.last_provider_sync_at;
    const outsideTail = !isWithinLiveTailPollWindow(kickoffAt, nowMs);
    const syncStale = isProviderSyncStale(lastSync, nowMs);

    if (!outsideTail && !syncStale) {
      continue;
    }

    if (!outsideTail) {
      continue;
    }

    const oldStatus = row.status as FixtureStatus;
    const ftHome = row.ft_home ?? row.score_home;
    const ftAway = row.ft_away ?? row.score_away;

    const { error: updateError } = await client
      .from("fixtures")
      .update({
        status: "FT",
        minute: null,
        ft_home: ftHome,
        ft_away: ftAway,
        last_provider_sync_at: syncedAt,
      })
      .eq("provider_id", row.provider_id);

    if (updateError) {
      console.error(
        `[live/finalize-stale] fixture ${row.provider_id}`,
        updateError
      );
      continue;
    }

    finalized += 1;
    logFixtureStatusTransition({
      fixtureProviderId: row.provider_id,
      oldStatus,
      newStatus: "FT",
      score: `${ftHome ?? 0}-${ftAway ?? 0}`,
      source: "finalize-expired-stale-live",
      timestamp: syncedAt,
    });
  }

  if (finalized > 0) {
    await invalidateFixturesListCaches(now);
  }

  return { finalized };
}
