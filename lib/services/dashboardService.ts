import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import {
  readH2hInterestForFixtures,
  readLeaguePrestigeMap,
  readRecentPredictionChanges,
  readStandingsRanksForFixtures,
  type PredictionChangeSummary,
} from "@/lib/ingestion/db-read";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import {
  getMatchesForDate,
  listLiveFixtures,
} from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

const LIVE_LIMIT = 6;
const TODAY_LIMIT = 8;
const UPCOMING_LIMIT = 8;
const UPCOMING_DAYS = 7;

export type DashboardData = {
  featured: Fixture | null;
  live: Fixture[];
  todayImportant: Fixture[];
  upcoming: Fixture[];
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

function dedupeFixtures(fixtures: Fixture[]): Fixture[] {
  const seen = new Set<number>();
  const result: Fixture[] = [];

  for (const fixture of fixtures) {
    if (seen.has(fixture.externalId)) {
      continue;
    }

    seen.add(fixture.externalId);
    result.push(fixture);
  }

  return result;
}

async function fetchFixturesForDates(dates: string[]): Promise<Fixture[]> {
  const results = await Promise.all(
    dates.map(async (date) => {
      const { data } = await getMatchesForDate(date);
      return data;
    })
  );

  return dedupeFixtures(results.flat());
}

async function buildImportanceContext(
  fixtures: Fixture[],
  now: Date
): Promise<ImportanceContext> {
  const [prestigeByLeagueId, standingsByFixtureId, h2hInterestByFixtureId] =
    await Promise.all([
      readLeaguePrestigeMap(),
      readStandingsRanksForFixtures(fixtures),
      readH2hInterestForFixtures(fixtures),
    ]);

  return {
    prestigeByLeagueId,
    standingsByFixtureId,
    h2hInterestByFixtureId,
    now,
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
  now = new Date()
): Promise<DashboardData> {
  const today = utcDateString(now);
  const yesterday = addUtcDays(today, -1);
  const tomorrow = addUtcDays(today, 1);
  const upcomingDates = Array.from({ length: UPCOMING_DAYS }, (_, index) =>
    addUtcDays(today, index + 1)
  );

  const [
    todayFixtures,
    yesterdayFixtures,
    tomorrowFixtures,
    liveResult,
    upcomingFixtures,
    aiInsights,
  ] = await Promise.all([
    getMatchesForDate(today).then(({ data }) => data),
    getMatchesForDate(yesterday).then(({ data }) => data),
    getMatchesForDate(tomorrow).then(({ data }) => data),
    listLiveFixtures(),
    fetchFixturesForDates(upcomingDates),
    readRecentPredictionChanges(5).catch(() => [] as PredictionChangeSummary[]),
  ]);

  const liveFixtures = liveResult.data;
  const fallbackFixtures = dedupeFixtures([
    ...yesterdayFixtures,
    ...tomorrowFixtures,
  ]);
  const isTodayFallback =
    todayFixtures.length === 0 && fallbackFixtures.length > 0;
  const todayCandidates = isTodayFallback ? fallbackFixtures : todayFixtures;

  const allCandidates = dedupeFixtures([
    ...liveFixtures,
    ...todayCandidates,
    ...upcomingFixtures,
  ]);

  const context = await buildImportanceContext(allCandidates, now);
  const usedIds = new Set<number>();

  const featuredCandidates = dedupeFixtures([
    ...liveFixtures,
    ...todayCandidates,
  ]);
  const featured =
    takeRankedFixtures(featuredCandidates, context, 1)[0] ?? null;

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

  const todayImportant = takeRankedFixtures(
    todayCandidates,
    context,
    TODAY_LIMIT,
    usedIds
  );
  for (const fixture of todayImportant) {
    usedIds.add(fixture.externalId);
  }

  const upcoming = takeRankedFixtures(
    upcomingFixtures,
    context,
    UPCOMING_LIMIT,
    usedIds
  );

  return {
    featured,
    live,
    todayImportant,
    upcoming,
    isTodayFallback,
    fallbackFixtures,
    aiInsights,
  };
}
