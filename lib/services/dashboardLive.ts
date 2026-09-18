import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import {
  readH2hInterestForFixtures,
  readLeaguePrestigeMap,
  readStandingsRanksForFixtures,
} from "@/lib/ingestion/db-read";
import { isAuthoritativeLivePresentation } from "@/lib/live/live-presentation";
import {
  attachAiUpdatedAtToFixturesSafe,
  isAiUpdatedMarkerFresh,
  type LiveFixtureRow,
} from "@/lib/live/live-fixture-meta";
import { listLiveFixtures } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

const LIVE_LIMIT = 6;

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
    preferredLeagueExternalId: null,
    now,
  };
}

/** Live fixtures for dashboard "Live now" (same ranking as getDashboardData). */
export async function getDashboardLiveFixtures(
  now = new Date()
): Promise<LiveFixtureRow[]> {
  const { data: liveFixtures } = await listLiveFixtures();
  const candidates = liveFixtures.filter((fixture) =>
    isAuthoritativeLivePresentation(fixture, now.getTime())
  );

  if (candidates.length === 0) {
    return [];
  }

  const withAi = await attachAiUpdatedAtToFixturesSafe(candidates, now);
  const context = await buildImportanceContext(withAi, now);
  return rankFixturesByImportance(withAi, context)
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
    .slice(0, LIVE_LIMIT)
    .map(({ fixture }) => fixture as LiveFixtureRow);
}
