import { addDaysToDateKey, buildTimezoneWindow } from "@/lib/datetime/timezone";
import {
  FIXTURES_PAST_DAYS,
  FIXTURES_WINDOW_DAYS,
} from "@/lib/fixtures/constants";
import {
  buildUpcomingAndPastDayGroups,
  collectActiveLeagueIds,
  collectLiveLeagueIds,
  collectUpcomingFixturesFromDayGroups,
  findNowAnchorFixtureId,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
import { isLiveFixtureStatus } from "@/lib/fixtures/live-status";
import {
  FIXTURE_SYNC_JOB_NAMES,
  resolveProviderSyncedAt,
  type FixtureSyncRunEvidence,
  type ProviderSyncSource,
} from "@/lib/fixtures/provider-synced-at";
import {
  parseFixturesParams,
  type FixturesSearchParams,
} from "@/lib/fixtures/url";
import { finalizeExpiredStaleLiveFixturesInDb } from "@/lib/live/finalize-expired-stale-live";
import { resolvePresentationFixtures } from "@/lib/live/live-presentation";
import type { CacheMeta } from "@/lib/redis/cache";
import { getMatchesInRange } from "@/lib/services/footballService";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fixture } from "@/types/domain";

export type FixturesData = {
  upcomingDayGroups: FixturesDayGroup[];
  pastDayGroups: FixturesDayGroup[];
  /** Primary upcoming groups (alias for anchors / legacy callers). */
  dayGroups: FixturesDayGroup[];
  liveLeagueIds: number[];
  activeLeagueIds: number[];
  nowAnchorFixtureId: number | null;
  todayDateKey: string;
  filters: FixturesSearchParams;
  isEmpty: boolean;
  meta: CacheMeta;
  providerSyncedAt: string | null;
  providerSyncSource: ProviderSyncSource | null;
  freshnessStale: boolean;
  providerUnavailable: boolean;
};

function filterByLeague(fixtures: Fixture[], league?: number): Fixture[] {
  if (league == null) {
    return fixtures;
  }

  return fixtures.filter((fixture) => fixture.league.externalId === league);
}

function normalizeFilterToken(value: string): string {
  return value.trim().toLowerCase();
}

function filterFixturesBySearchParams(
  fixtures: Fixture[],
  params: FixturesSearchParams
): Fixture[] {
  let result = filterByLeague(fixtures, params.league);

  if (params.country) {
    const countryNeedle = normalizeFilterToken(params.country);
    result = result.filter((fixture) => {
      const country = fixture.league.country;
      if (!country) {
        return false;
      }
      return (
        normalizeFilterToken(country.name) === countryNeedle ||
        (country.code != null &&
          normalizeFilterToken(country.code) === countryNeedle)
      );
    });
  }

  if (params.q) {
    const query = normalizeFilterToken(params.q);
    result = result.filter((fixture) => {
      const leagueName = fixture.league.name.toLowerCase();
      const countryName = fixture.league.country?.name.toLowerCase() ?? "";
      return leagueName.includes(query) || countryName.includes(query);
    });
  }

  return result;
}

export { parseFixturesParams };

function readStatsDate(stats: unknown): string | null {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return null;
  }

  const date = (stats as { date?: unknown }).date;
  return typeof date === "string" && date.length > 0 ? date : null;
}

function mapSyncRun(row: {
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  stats: unknown;
}): FixtureSyncRunEvidence {
  return {
    jobName: row.job_name,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    statsDate: readStatsDate(row.stats),
  };
}

async function loadFixtureSyncRuns(): Promise<FixtureSyncRunEvidence[]> {
  try {
    const client = createAdminClient();
    const jobs = [...FIXTURE_SYNC_JOB_NAMES];
    const [recent, complete] = await Promise.all([
      client
        .from("ingestion_sync_runs")
        .select("job_name, status, started_at, finished_at, stats")
        .in("job_name", jobs)
        .order("started_at", { ascending: false })
        .limit(20),
      client
        .from("ingestion_sync_runs")
        .select("job_name, status, started_at, finished_at, stats")
        .in("job_name", jobs)
        .eq("status", "complete")
        .order("finished_at", { ascending: false })
        .limit(10),
    ]);

    return [
      ...(recent.error ? [] : (recent.data ?? [])),
      ...(complete.error ? [] : (complete.data ?? [])),
    ].map(mapSyncRun);
  } catch (error) {
    console.warn("[fixtures] provider sync runs unavailable", error);
    return [];
  }
}

function leagueIdsForSyncFallback(
  fixtures: Fixture[],
  leagueFilter?: number
): number[] {
  const ids = new Set<number>();

  for (const fixture of fixtures) {
    ids.add(fixture.league.externalId);
  }

  if (ids.size === 0 && leagueFilter != null) {
    ids.add(leagueFilter);
  }

  return [...ids];
}

async function loadLeagueLastSyncAt(leagueIds: number[]): Promise<string[]> {
  if (leagueIds.length === 0) {
    return [];
  }

  try {
    const client = createAdminClient();
    const { data, error } = await client
      .from("ingestion_league_season_state")
      .select("last_sync_at")
      .in("league_provider_id", leagueIds);

    if (error || !data) {
      return [];
    }

    return data.flatMap((row) => (row.last_sync_at ? [row.last_sync_at] : []));
  } catch (error) {
    console.warn("[fixtures] league sync times unavailable", error);
    return [];
  }
}

export async function getFixturesData(
  params: FixturesSearchParams = {},
  timeZone: string,
  now = new Date()
): Promise<FixturesData> {
  await finalizeExpiredStaleLiveFixturesInDb(now);

  const { fromUtc, toUtcExclusive, todayDateKey } = buildTimezoneWindow(
    now,
    timeZone,
    FIXTURES_PAST_DAYS,
    FIXTURES_WINDOW_DAYS
  );
  const fromDateKey = addDaysToDateKey(todayDateKey, -FIXTURES_PAST_DAYS);
  const toDateKeyExclusive = addDaysToDateKey(
    todayDateKey,
    FIXTURES_WINDOW_DAYS + 1
  );
  const leagueFilterActive = params.league != null;

  const [result, discoveryResult, runs] = await Promise.all([
    getMatchesInRange(fromUtc, toUtcExclusive, params.league),
    leagueFilterActive
      ? getMatchesInRange(fromUtc, toUtcExclusive)
      : Promise.resolve(null),
    loadFixtureSyncRuns(),
  ]);
  const nowMs = now.getTime();
  const listFixtures = resolvePresentationFixtures(result.data, nowMs);
  const discoveryFixtures =
    leagueFilterActive && discoveryResult != null
      ? resolvePresentationFixtures(discoveryResult.data, nowMs)
      : listFixtures;
  const filtered = filterFixturesBySearchParams(listFixtures, params);

  const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
    filtered,
    now,
    timeZone,
    todayDateKey,
    params.league
  );

  const upcomingFixtures =
    collectUpcomingFixturesFromDayGroups(upcomingDayGroups);
  const anchorInput = {
    now,
    todayDateKey,
    hasLiveFixture: discoveryFixtures.some((fixture) =>
      isLiveFixtureStatus(fixture.status)
    ),
    windowFromDate: fromDateKey,
    windowToDateExclusive: toDateKeyExclusive,
    runs,
    fixtureLastProviderSyncAt: discoveryFixtures.map(
      (fixture) => fixture.liveClock?.lastProviderSyncAt
    ),
    envelopeCachedAt: result.meta.cachedAt ?? null,
    persistedFixtureCount: discoveryFixtures.length,
    metaStale: result.meta.stale,
  };
  let anchor = resolveProviderSyncedAt({
    ...anchorInput,
    leagueLastSyncAt: [],
  });

  if (
    anchor.providerSyncSource == null ||
    anchor.providerSyncSource === "cache_envelope"
  ) {
    const leagueLastSyncAt = await loadLeagueLastSyncAt(
      leagueIdsForSyncFallback(discoveryFixtures, params.league)
    );

    if (leagueLastSyncAt.length > 0) {
      anchor = resolveProviderSyncedAt({
        ...anchorInput,
        leagueLastSyncAt,
      });
    }
  }

  return {
    upcomingDayGroups,
    pastDayGroups,
    dayGroups: upcomingDayGroups,
    liveLeagueIds: collectLiveLeagueIds(discoveryFixtures),
    activeLeagueIds: collectActiveLeagueIds(discoveryFixtures),
    nowAnchorFixtureId: findNowAnchorFixtureId(upcomingFixtures),
    todayDateKey,
    filters: { league: params.league },
    isEmpty: upcomingDayGroups.length === 0 && pastDayGroups.length === 0,
    meta: result.meta,
    providerSyncedAt: anchor.providerSyncedAt,
    providerSyncSource: anchor.providerSyncSource,
    freshnessStale: anchor.freshnessStale,
    providerUnavailable: anchor.providerUnavailable,
  };
}
