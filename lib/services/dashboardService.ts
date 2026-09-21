import {
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
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import {
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

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function fixtureUtcDateKey(fixture: Fixture): string {
  return fixture.kickoffAt.slice(0, 10);
}

function fixturesOnUtcDate(fixtures: Fixture[], dateKey: string): Fixture[] {
  return fixtures.filter((fixture) => fixtureUtcDateKey(fixture) === dateKey);
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
  context: ImportanceContext
): DashboardPoolContext {
  return {
    preferredLeagueExternalId: context.preferredLeagueExternalId,
    prestigeByLeagueId: context.prestigeByLeagueId,
    standingsByFixtureId: context.standingsByFixtureId,
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
  } = {}
): Promise<DashboardData> {
  const now = options.now ?? new Date();
  const preferredLeagueExternalId = options.preferredLeagueExternalId ?? null;
  const today = utcDateString(now);
  const yesterday = addUtcDays(today, -1);
  const tomorrow = addUtcDays(today, 1);
  const upcomingFrom = addUtcDays(today, 1);
  const upcomingThrough = addUtcDays(today, UPCOMING_DAYS);
  const rangeFrom = yesterday;
  const rangeToExclusive = addUtcDays(today, UPCOMING_DAYS + 1);

  const [rangeResult, liveResult, aiInsights] = await Promise.all([
    getMatchesInRange(rangeFrom, rangeToExclusive),
    listLiveFixtures(),
    readRecentPredictionChanges(5).catch(() => [] as PredictionChangeSummary[]),
  ]);

  const rangeFixtures = dedupeFixtures(rangeResult.data);
  const todayFixtures = fixturesOnUtcDate(rangeFixtures, today);
  const yesterdayFixtures = fixturesOnUtcDate(rangeFixtures, yesterday);
  const tomorrowFixtures = fixturesOnUtcDate(rangeFixtures, tomorrow);
  const upcomingFixtures = rangeFixtures.filter((fixture) => {
    const dateKey = fixtureUtcDateKey(fixture);
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
  const poolContext = toDashboardPoolContext(context);
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
