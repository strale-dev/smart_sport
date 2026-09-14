import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

export function dedupeFixtures(fixtures: Fixture[]): Fixture[] {
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

/** Forward-only pool when UTC today has no fixtures (never includes yesterday). */
export function buildForwardFallbackFixtures(input: {
  todayUtc: string;
  tomorrowFixtures: Fixture[];
  upcomingFixtures: Fixture[];
}): Fixture[] {
  return dedupeFixtures([
    ...input.tomorrowFixtures,
    ...input.upcomingFixtures.filter(
      (fixture) => fixture.kickoffAt.slice(0, 10) > input.todayUtc
    ),
  ]);
}

export function resolveTodayCandidates(input: {
  todayFixtures: Fixture[];
  forwardFallback: Fixture[];
}): { todayCandidates: Fixture[]; isTodayFallback: boolean } {
  if (input.todayFixtures.length > 0) {
    return {
      todayCandidates: input.todayFixtures,
      isTodayFallback: false,
    };
  }

  if (input.forwardFallback.length > 0) {
    return {
      todayCandidates: input.forwardFallback,
      isTodayFallback: true,
    };
  }

  return {
    todayCandidates: [],
    isTodayFallback: false,
  };
}

/** Live fixtures always eligible for Important today, regardless of kickoff date. */
export function mergeLiveIntoImportantCandidates(
  todayCandidates: Fixture[],
  liveFixtures: Fixture[]
): Fixture[] {
  const liveOnly = liveFixtures.filter((fixture) =>
    isLiveFixtureStatus(fixture.status)
  );

  return dedupeFixtures([...liveOnly, ...todayCandidates]);
}

export function sortImportantTodayFixtures(
  fixtures: Fixture[],
  context: ImportanceContext
): Fixture[] {
  const importance = rankFixturesByImportance(fixtures, context);
  const scoreById = new Map(
    importance.map(({ fixture, score }) => [fixture.externalId, score])
  );

  return [...fixtures].sort((left, right) => {
    const leftLive = isLiveFixtureStatus(left.status);
    const rightLive = isLiveFixtureStatus(right.status);

    if (leftLive !== rightLive) {
      return leftLive ? -1 : 1;
    }

    const leftScheduled = left.status === "NS" || left.status === "TBD" ? 0 : 1;
    const rightScheduled =
      right.status === "NS" || right.status === "TBD" ? 0 : 1;

    if (leftScheduled !== rightScheduled) {
      return leftScheduled - rightScheduled;
    }

    const kickoffDiff =
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime();
    if (kickoffDiff !== 0) {
      return kickoffDiff;
    }

    const leftScore = scoreById.get(left.externalId) ?? 0;
    const rightScore = scoreById.get(right.externalId) ?? 0;
    return rightScore - leftScore;
  });
}

export function takeImportantTodayFixtures(
  fixtures: Fixture[],
  context: ImportanceContext,
  limit: number,
  excludeIds = new Set<number>()
): Fixture[] {
  return sortImportantTodayFixtures(fixtures, context)
    .filter((fixture) => !excludeIds.has(fixture.externalId))
    .slice(0, limit);
}

export function buildRecentResultsFixtures(
  yesterdayFixtures: Fixture[],
  limit: number
): Fixture[] {
  return yesterdayFixtures
    .filter((fixture) => isFinishedFixtureStatus(fixture.status))
    .sort(
      (left, right) =>
        new Date(right.kickoffAt).getTime() - new Date(left.kickoffAt).getTime()
    )
    .slice(0, limit);
}

/** FT strictly before todayUtc must never appear in today/featured pools. */
export function assertNoPastFinishedInTodayPool(
  todayUtc: string,
  fixtures: Fixture[]
): void {
  for (const fixture of fixtures) {
    const kickoffDate = fixture.kickoffAt.slice(0, 10);
    if (isFinishedFixtureStatus(fixture.status) && kickoffDate < todayUtc) {
      throw new Error(
        `Past finished fixture ${fixture.externalId} leaked into today pool`
      );
    }
  }
}
