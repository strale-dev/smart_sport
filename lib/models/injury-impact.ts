import { readFixtureSidelinedFromDb } from "@/lib/ingestion/db-read";
import { createAdminClient } from "@/lib/supabase/admin";

const TOP_SCORER_SLOT_COUNT = 3;
const IMPACT_PER_TOP_SCORER = 0.12;
const IMPACT_PER_OTHER_SIDELINED = 0.03;
const MAX_IMPACT = 0.35;

export type InjuryImpactFeatures = {
  homeInjuryImpact: number | null;
  awayInjuryImpact: number | null;
  homeTopScorersSidelined: number;
  awayTopScorersSidelined: number;
};

async function loadTopScorerProviderIdsByTeam(
  seasonUuid: string,
  teamUuid: string,
  limit: number
): Promise<Set<number>> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("player_seasons")
    .select(
      `
      goals,
      player:players (provider_id)
    `
    )
    .eq("season_id", seasonUuid)
    .eq("team_id", teamUuid)
    .not("goals", "is", null)
    .order("goals", { ascending: false })
    .limit(limit * 4);

  if (error) {
    throw new Error(`Failed to load top scorers: ${error.message}`);
  }

  const ids = new Set<number>();
  for (const row of data ?? []) {
    const player = row.player as { provider_id: number } | null;
    if (player?.provider_id != null) {
      ids.add(player.provider_id);
    }
    if (ids.size >= limit) {
      break;
    }
  }

  return ids;
}

function impactFromCounts(
  topScorersOut: number,
  otherSidelined: number
): number {
  const raw =
    topScorersOut * IMPACT_PER_TOP_SCORER +
    otherSidelined * IMPACT_PER_OTHER_SIDELINED;
  return Number(Math.min(MAX_IMPACT, raw).toFixed(3));
}

export async function computeInjuryImpactFeatures(input: {
  fixtureExternalId: number;
  seasonUuid: string | null;
  homeTeamUuid: string;
  awayTeamUuid: string;
  homeTeamProviderId: number;
  awayTeamProviderId: number;
}): Promise<InjuryImpactFeatures> {
  const sidelined = await readFixtureSidelinedFromDb(input.fixtureExternalId);

  if (sidelined.length === 0) {
    return {
      homeInjuryImpact: null,
      awayInjuryImpact: null,
      homeTopScorersSidelined: 0,
      awayTopScorersSidelined: 0,
    };
  }

  let homeTopIds = new Set<number>();
  let awayTopIds = new Set<number>();

  if (input.seasonUuid) {
    [homeTopIds, awayTopIds] = await Promise.all([
      loadTopScorerProviderIdsByTeam(
        input.seasonUuid,
        input.homeTeamUuid,
        TOP_SCORER_SLOT_COUNT
      ),
      loadTopScorerProviderIdsByTeam(
        input.seasonUuid,
        input.awayTeamUuid,
        TOP_SCORER_SLOT_COUNT
      ),
    ]);
  }

  let homeTopOut = 0;
  let homeOther = 0;
  let awayTopOut = 0;
  let awayOther = 0;

  for (const entry of sidelined) {
    const playerId = entry.playerExternalId;
    if (entry.teamExternalId === input.homeTeamProviderId) {
      if (playerId != null && homeTopIds.has(playerId)) {
        homeTopOut += 1;
      } else {
        homeOther += 1;
      }
    } else if (entry.teamExternalId === input.awayTeamProviderId) {
      if (playerId != null && awayTopIds.has(playerId)) {
        awayTopOut += 1;
      } else {
        awayOther += 1;
      }
    }
  }

  const hasTopScorerData =
    input.seasonUuid != null && (homeTopIds.size > 0 || awayTopIds.size > 0);

  return {
    homeInjuryImpact: impactFromCounts(homeTopOut, homeOther),
    awayInjuryImpact: impactFromCounts(awayTopOut, awayOther),
    homeTopScorersSidelined: hasTopScorerData ? homeTopOut : 0,
    awayTopScorersSidelined: hasTopScorerData ? awayTopOut : 0,
  };
}
