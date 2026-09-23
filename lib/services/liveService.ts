import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import {
  readH2hInterestForFixtures,
  readLeaguePrestigeMap,
  readStandingsRanksForFixtures,
} from "@/lib/ingestion/db-read";
import { filterAllowlistedFixtures } from "@/lib/fixtures/navigable";
import {
  LIVE_PAGE_SIZE,
  LIVE_STATUS_FILTERS,
  UPCOMING_SOON_HOURS,
  UPCOMING_SOON_LIMIT,
  type LiveStatusFilter,
} from "@/lib/live/constants";
import { isAuthoritativeLivePresentation } from "@/lib/live/live-presentation";
import {
  getMatchesForDate,
  listLiveFixtures,
} from "@/lib/services/footballService";
import type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/live/live-center-types";
import {
  attachAiUpdatedAtToFixturesSafe,
  isAiUpdatedMarkerFresh,
  type LiveFixtureRow,
} from "@/lib/live/live-fixture-meta";
import type { Fixture, FixtureStatus } from "@/types/domain";

export type {
  LiveCenterData,
  LiveCenterParams,
} from "@/lib/live/live-center-types";

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
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

async function buildImportanceContext(
  fixtures: Fixture[],
  now: Date
): Promise<ImportanceContext> {
  const [prestigeByLeagueId, standingsByFixtureId, h2hInterestByFixtureId] =
    await Promise.all([
      readLeaguePrestigeMap(),
      readStandingsRanksForFixtures(fixtures),
      readH2hInterestForFixtures(fixtures).catch((error) => {
        console.warn("[liveService] H2H interest lookup failed:", error);
        return new Map<number, number>();
      }),
    ]);

  return {
    prestigeByLeagueId,
    standingsByFixtureId,
    h2hInterestByFixtureId,
    preferredLeagueExternalId: null,
    now,
  };
}

function sortLiveFixturesByImportance(
  fixtures: LiveFixtureRow[],
  context: ImportanceContext,
  now: Date
): LiveFixtureRow[] {
  return rankFixturesByImportance(fixtures, context)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftRow = left.fixture as LiveFixtureRow;
      const rightRow = right.fixture as LiveFixtureRow;
      const leftFresh = isAiUpdatedMarkerFresh(leftRow.aiUpdatedAt, now);
      const rightFresh = isAiUpdatedMarkerFresh(rightRow.aiUpdatedAt, now);

      if (leftFresh !== rightFresh) {
        return leftFresh ? -1 : 1;
      }

      return (
        new Date(left.fixture.kickoffAt).getTime() -
        new Date(right.fixture.kickoffAt).getTime()
      );
    })
    .map(({ fixture }) => fixture as LiveFixtureRow);
}

function filterLiveFixtures(
  fixtures: Fixture[],
  params: LiveCenterParams,
  now = new Date()
): Fixture[] {
  const nowMs = now.getTime();
  return fixtures.filter((fixture) => {
    if (!isAuthoritativeLivePresentation(fixture, nowMs)) {
      return false;
    }

    if (params.league != null && fixture.league.externalId !== params.league) {
      return false;
    }

    if (params.status != null && fixture.status !== params.status) {
      return false;
    }

    return true;
  });
}

function paginateFixtures(
  fixtures: LiveFixtureRow[],
  page: number
): {
  fixtures: LiveFixtureRow[];
  totalCount: number;
  page: number;
  totalPages: number;
} {
  const totalCount = fixtures.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIVE_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * LIVE_PAGE_SIZE;

  return {
    fixtures: fixtures.slice(start, start + LIVE_PAGE_SIZE),
    totalCount,
    page: safePage,
    totalPages,
  };
}

function getUpcomingSoonFixtures(fixtures: Fixture[], now: Date): Fixture[] {
  const windowEnd = now.getTime() + UPCOMING_SOON_HOURS * 60 * 60 * 1000;

  return fixtures
    .filter((fixture) => {
      if (fixture.status !== "NS") {
        return false;
      }

      const kickoff = new Date(fixture.kickoffAt).getTime();
      return kickoff >= now.getTime() && kickoff <= windowEnd;
    })
    .sort(
      (left, right) =>
        new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
    )
    .slice(0, UPCOMING_SOON_LIMIT);
}

export function parseLiveCenterParams(input: {
  league?: string;
  status?: string;
  page?: string;
}): LiveCenterParams {
  const league =
    input.league != null && input.league !== ""
      ? Number.parseInt(input.league, 10)
      : undefined;
  const status = LIVE_STATUS_FILTERS.includes(input.status as LiveStatusFilter)
    ? (input.status as LiveStatusFilter)
    : undefined;
  const page =
    input.page != null && input.page !== ""
      ? Number.parseInt(input.page, 10)
      : 1;

  return {
    league: Number.isFinite(league) ? league : undefined,
    status,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export async function getLiveCenterData(
  params: LiveCenterParams = {},
  now = new Date()
): Promise<LiveCenterData> {
  const today = utcDateString(now);

  const [liveResult, todayResult] = await Promise.all([
    listLiveFixtures(),
    getMatchesForDate(today),
  ]);

  const liveFromToday = todayResult.data.filter((fixture) =>
    isAuthoritativeLivePresentation(fixture, now.getTime())
  );
  const liveCandidates = filterAllowlistedFixtures(
    dedupeFixtures([...liveResult.data, ...liveFromToday])
  );
  const filtered = filterLiveFixtures(liveCandidates, params, now);
  const withAi = await attachAiUpdatedAtToFixturesSafe(filtered, now);
  const context = await buildImportanceContext(withAi, now);
  const sorted = sortLiveFixturesByImportance(withAi, context, now);
  const paginated = paginateFixtures(sorted, params.page ?? 1);
  const upcomingSoon = getUpcomingSoonFixtures(todayResult.data, now);

  return {
    fixtures: paginated.fixtures,
    totalCount: paginated.totalCount,
    page: paginated.page,
    totalPages: paginated.totalPages,
    upcomingSoon,
    filters: {
      league: params.league,
      status: params.status,
    },
  };
}

export function isLiveStatusFilter(
  status: string | undefined
): status is LiveStatusFilter {
  return LIVE_STATUS_FILTERS.includes(status as LiveStatusFilter);
}

export function isValidFixtureStatusForFilter(
  status: FixtureStatus
): status is LiveStatusFilter {
  return LIVE_STATUS_FILTERS.includes(status as LiveStatusFilter);
}
