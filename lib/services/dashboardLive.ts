import {
  rankFixturesByImportance,
  type ImportanceContext,
} from "@/lib/dashboard/importance-score";
import {
  readH2hInterestForFixtures,
  readLeaguePrestigeMap,
  readStandingsRanksForFixtures,
} from "@/lib/ingestion/db-read";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
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
    now,
  };
}

/** Live fixtures for dashboard "Live now" (same ranking as getDashboardData). */
export async function getDashboardLiveFixtures(
  now = new Date()
): Promise<Fixture[]> {
  const { data: liveFixtures } = await listLiveFixtures();
  const candidates = liveFixtures.filter((fixture) =>
    isLiveFixtureStatus(fixture.status)
  );

  if (candidates.length === 0) {
    return [];
  }

  const context = await buildImportanceContext(candidates, now);
  return rankFixturesByImportance(candidates, context)
    .slice(0, LIVE_LIMIT)
    .map(({ fixture }) => fixture);
}
