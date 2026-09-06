import { loadTerminalFixturesChronological } from "@/lib/analytics/point-in-time";
import {
  applyEloResultToMap,
  getRatingFromMap,
  type EloRatingMap,
} from "@/lib/models/elo";
import { batchUpdateTeamEloRatings } from "@/lib/predictions/db";
import { DEFAULT_MODEL_COEFFICIENTS } from "@/lib/models/coefficients";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export async function backfillEloRatings(): Promise<{
  matchesProcessed: number;
  teamsUpdated: number;
}> {
  const fixtures = await loadTerminalFixturesChronological();
  const ratings: EloRatingMap = new Map();

  for (const fixture of fixtures) {
    const homeTeam = unwrapRelation(fixture.home_team);
    const awayTeam = unwrapRelation(fixture.away_team);
    const league = unwrapRelation(fixture.league);

    if (
      !homeTeam ||
      !awayTeam ||
      !league ||
      fixture.score_home == null ||
      fixture.score_away == null
    ) {
      continue;
    }

    getRatingFromMap(ratings, homeTeam.provider_id);
    getRatingFromMap(ratings, awayTeam.provider_id);

    applyEloResultToMap(ratings, {
      homeTeamProviderId: homeTeam.provider_id,
      awayTeamProviderId: awayTeam.provider_id,
      homeGoals: fixture.score_home,
      awayGoals: fixture.score_away,
      leagueProviderId: league.provider_id,
      coefficients: DEFAULT_MODEL_COEFFICIENTS.elo,
    });
  }

  const teamsUpdated = await batchUpdateTeamEloRatings(ratings);

  return {
    matchesProcessed: fixtures.length,
    teamsUpdated,
  };
}

async function main() {
  console.log("Replaying Elo ratings from terminal fixtures...");
  const result = await backfillEloRatings();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Elo backfill failed:", error);
  process.exit(1);
});
