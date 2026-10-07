import {
  createEmptyDashboardFollowPoolSets,
  filterDashboardRankingCandidates,
  type DashboardPoolContext,
} from "@/lib/competitions/dashboard-pool";
import {
  assertNoPastFinishedInTodayPool,
  buildForwardFallbackFixtures,
  buildRecentResultsFixtures,
  dedupeFixtures,
  mergeLiveIntoImportantCandidates,
  resolveTodayCandidates,
  takeImportantTodayFixtures,
} from "@/lib/dashboard/dashboard-candidates";
import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import {
  isFinishedFixtureStatus,
  shouldShowFixtureScore,
} from "@/lib/fixtures/display";
import {
  addDaysToDateKey,
  formatDateKeyInTimezone,
} from "@/lib/datetime/timezone";
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import { LIFECYCLE_TIMEZONE } from "@/lib/fixtures/readiness/constants";
import { getLifecycleTodayDateKey } from "@/lib/fixtures/readiness";
import {
  readDashboardFollowPoolIdsForUser,
  readH2hInterestForFixtures,
  readLeaguePrestigeMap,
  readRecentPredictionChanges,
  readStandingsRanksForFixtures,
  type PredictionChangeSummary,
} from "@/lib/ingestion/db-read";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import {
  getMatchesInRange,
  listLiveFixtures,
} from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

const LIVE_LIMIT = 6;
const TODAY_LIMIT = 8;
const UPCOMING_LIMIT = 8;
const UPCOMING_DAYS = 7;
const RECENT_RESULTS_LIMIT = 6;

export type DashboardData = {
  featured: Fixture | null;
  live: Fixture[];
  todayImportant: Fixture[];
  upcoming: Fixture[];
  recentResults: Fixture[];
  isTodayFallback: boolean;
  fallbackFixtures: Fixture[];
  aiInsights: PredictionChangeSummary[];
};

function addLifecycleDays(dateKey: string, days: number): string {
  return addDaysToDateKey(dateKey, days);
}

function fixtureLifecycleDateKey(fixture: Fixture): string {
  return formatDateKeyInTimezone(fixture.kickoffAt, LIFECYCLE_TIMEZONE);
}

function fixturesOnLifecycleDate(
  fixtures: Fixture[],
  dateKey: string
): Fixture[] {
  return fixtures.filter(
    (fixture) => fixtureLifecycleDateKey(fixture) === dateKey
  );
}

async function buildImportanceContext(
  fixtures: Fixture[],
  now: Date,
  preferredLeagueExternalId: number | null = null
): Promise<ImportanceContext> {
  const [prestigeByLeagueId, standingsByFixtureId, h2hInterestByFixtureId] =
    await Promise.all([
      readLeaguePrestigeMap(),
      readStandingsRanksForFixtures(fixtures),
      readH2hInterestForFixtures(fixtures).catch((error) => {
        console.warn("[dashboard] H2H interest lookup failed:", error);
        return new Map<number, number>();
      }),
    ]);

  return {
    prestigeByLeagueId,
    standingsByFixtureId,
    h2hInterestByFixtureId,
    preferredLeagueExternalId,
    now,
  };
}

function toDashboardPoolContext(
  context: ImportanceContext,
  followPoolIds: {
    followedTeamProviderIds: ReadonlySet<number>;
    followedLeagueProviderIds: ReadonlySet<number>;
    favoriteFixtureProviderIds: ReadonlySet<number>;
  }
): DashboardPoolContext {
  return {
    preferredLeagueExternalId: context.preferredLeagueExternalId,
    prestigeByLeagueId: context.prestigeByLeagueId,
    standingsByFixtureId: context.standingsByFixtureId,
    followedTeamProviderIds: followPoolIds.followedTeamProviderIds,
    followedLeagueProviderIds: followPoolIds.followedLeagueProviderIds,
    favoriteFixtureProviderIds: followPoolIds.favoriteFixtureProviderIds,
  };
}

function takeRankedFixtures(
  fixtures: Fixture[],
  context: ImportanceContext,
  limit: number,
  excludeIds = new Set<number>()
): Fixture[] {
  return rankFixturesByImportance(fixtures, context)
    .filter(({ fixture }) => !excludeIds.has(fixture.externalId))
    .slice(0, limit)
    .map(({ fixture }) => fixture);
}

export async function getDashboardData(
  options: {
    now?: Date;
    preferredLeagueExternalId?: number | null;
    userId?: string | null;
  } = {}
): Promise<DashboardData> {
  const now = options.now ?? new Date();
  const preferredLeagueExternalId = options.preferredLeagueExternalId ?? null;
  const userId = options.userId ?? null;
  const today = getLifecycleTodayDateKey(now);
  const yesterday = addLifecycleDays(today, -1);
  const tomorrow = addLifecycleDays(today, 1);
  const upcomingFrom = addLifecycleDays(today, 1);
  const upcomingThrough = addLifecycleDays(today, UPCOMING_DAYS);
  const rangeFrom = yesterday;
  const rangeToExclusive = addLifecycleDays(today, UPCOMING_DAYS + 1);

  const followPoolPromise = userId
    ? readDashboardFollowPoolIdsForUser(userId).catch((error) => {
        console.warn("[dashboard] follow pool lookup failed:", error);
        return createEmptyDashboardFollowPoolSets();
      })
    : Promise.resolve(createEmptyDashboardFollowPoolSets());

  const [rangeResult, liveResult, aiInsights, followPoolIds] =
    await Promise.all([
      getMatchesInRange(rangeFrom, rangeToExclusive),
      listLiveFixtures(),
      readRecentPredictionChanges(5).catch(
        () => [] as PredictionChangeSummary[]
      ),
      followPoolPromise,
    ]);

  const rangeFixtures = dedupeFixtures(rangeResult.data);
  const todayFixtures = fixturesOnLifecycleDate(rangeFixtures, today);
  const yesterdayFixtures = fixturesOnLifecycleDate(rangeFixtures, yesterday);
  const tomorrowFixtures = fixturesOnLifecycleDate(rangeFixtures, tomorrow);
  const upcomingFixtures = rangeFixtures.filter((fixture) => {
    const dateKey = fixtureLifecycleDateKey(fixture);
    return dateKey >= upcomingFrom && dateKey <= upcomingThrough;
  });

  const liveFixtures = filterAllowlistedFixtures(liveResult.data);
  const forwardFallback = buildForwardFallbackFixtures({
    todayUtc: today,
    tomorrowFixtures,
    upcomingFixtures,
  });

  const { todayCandidates, isTodayFallback } = resolveTodayCandidates({
    todayFixtures,
    forwardFallback,
  });

  const importantCandidates = mergeLiveIntoImportantCandidates(
    todayCandidates,
    liveFixtures
  );

  assertNoPastFinishedInTodayPool(today, importantCandidates);
  assertNoPastFinishedInTodayPool(today, todayCandidates);

  const featuredCandidates = dedupeFixtures([
    ...liveFixtures.filter((fixture) => isLiveFixtureStatus(fixture.status)),
    ...todayCandidates,
  ]);
  assertNoPastFinishedInTodayPool(today, featuredCandidates);

  const allCandidates = dedupeFixtures([
    ...liveFixtures,
    ...importantCandidates,
    ...upcomingFixtures,
  ]);

  const context = await buildImportanceContext(
    allCandidates,
    now,
    preferredLeagueExternalId
  );
  const poolContext = toDashboardPoolContext(context, followPoolIds);
  const usedIds = new Set<number>();

  const featured =
    takeRankedFixtures(
      filterDashboardRankingCandidates(featuredCandidates, poolContext),
      context,
      1
    )[0] ?? null;

  if (featured) {
    usedIds.add(featured.externalId);
  }

  const live = takeRankedFixtures(
    liveFixtures.filter((fixture) => isLiveFixtureStatus(fixture.status)),
    context,
    LIVE_LIMIT,
    usedIds
  );
  for (const fixture of live) {
    usedIds.add(fixture.externalId);
  }

  const todayImportant = takeImportantTodayFixtures(
    filterDashboardRankingCandidates(importantCandidates, poolContext),
    context,
    TODAY_LIMIT,
    usedIds
  );
  for (const fixture of todayImportant) {
    usedIds.add(fixture.externalId);
  }

  const upcomingCandidates = upcomingFixtures.filter((fixture) => {
    if (isFinishedFixtureStatus(fixture.status)) {
      return false;
    }

    if (shouldShowFixtureScore(fixture)) {
      return false;
    }

    return new Date(fixture.kickoffAt).getTime() > now.getTime();
  });

  const upcoming = takeRankedFixtures(
    filterDashboardRankingCandidates(upcomingCandidates, poolContext),
    context,
    UPCOMING_LIMIT,
    usedIds
  );

  const recentResults = buildRecentResultsFixtures(
    filterDashboardRankingCandidates(yesterdayFixtures, poolContext),
    RECENT_RESULTS_LIMIT
  );

  return {
    featured,
    live,
    todayImportant,
    upcoming,
    recentResults,
    isTodayFallback,
    fallbackFixtures: forwardFallback,
    aiInsights,
  };
}
