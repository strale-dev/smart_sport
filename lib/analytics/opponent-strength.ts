import {
  resultForTeam,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import {
  applyEloResultToMap,
  getRatingFromMap,
  type EloRatingMap,
} from "@/lib/models/elo";
import { createAdminClient } from "@/lib/supabase/admin";
import { TERMINAL_FIXTURE_STATUSES } from "@/lib/analytics/team-history-query";

export type ChronologicalFixtureForElo = {
  provider_id: number;
  kickoff_at: string;
  score_home: number;
  score_away: number;
  home_team: { provider_id: number };
  away_team: { provider_id: number };
  league: { provider_id: number } | null;
};

async function loadChronologicalFixturesForTeams(input: {
  teamProviderIds: number[];
  beforeAt: string;
}): Promise<ChronologicalFixtureForElo[]> {
  if (input.teamProviderIds.length === 0) {
    return [];
  }

  const client = createAdminClient();
  const { data: teams, error: teamError } = await client
    .from("teams")
    .select("id, provider_id")
    .in("provider_id", input.teamProviderIds);

  if (teamError) {
    throw new Error(
      `Failed to resolve teams for Elo replay: ${teamError.message}`
    );
  }

  const teamUuids = (teams ?? []).map((t) => t.id);
  if (teamUuids.length === 0) {
    return [];
  }

  const orClause = teamUuids
    .flatMap((id) => [`home_team_id.eq.${id}`, `away_team_id.eq.${id}`])
    .join(",");

  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      provider_id,
      kickoff_at,
      score_home,
      score_away,
      home_team:teams!fixtures_home_team_id_fkey (provider_id),
      away_team:teams!fixtures_away_team_id_fkey (provider_id),
      league:leagues (provider_id)
    `
    )
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", input.beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .or(orClause)
    .order("kickoff_at", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load fixtures for Elo replay: ${error.message}`);
  }

  const rows: ChronologicalFixtureForElo[] = [];
  for (const row of data ?? []) {
    const home = Array.isArray(row.home_team)
      ? row.home_team[0]
      : row.home_team;
    const away = Array.isArray(row.away_team)
      ? row.away_team[0]
      : row.away_team;
    const league = Array.isArray(row.league) ? row.league[0] : row.league;
    if (!home || !away || row.score_home == null || row.score_away == null) {
      continue;
    }
    rows.push({
      provider_id: row.provider_id,
      kickoff_at: row.kickoff_at,
      score_home: row.score_home,
      score_away: row.score_away,
      home_team: { provider_id: home.provider_id },
      away_team: { provider_id: away.provider_id },
      league: league ? { provider_id: league.provider_id } : null,
    });
  }

  return rows;
}

/**
 * Replays Elo chronologically and returns opponent rating at kickoff per fixture provider_id.
 */
export async function buildOpponentEloAtKickoffMap(input: {
  teamProviderId: number;
  rows: TeamFixtureRow[];
  beforeAt: string;
}): Promise<Map<number, number>> {
  const opponentProviderIds = new Set<number>();
  for (const row of input.rows) {
    const entry = resultForTeam(row, input.teamProviderId);
    if (!entry) {
      continue;
    }
    const home = row.home_team?.provider_id;
    const away = row.away_team?.provider_id;
    if (home == null || away == null) {
      continue;
    }
    opponentProviderIds.add(home === input.teamProviderId ? away : home);
  }

  const teamIds = [input.teamProviderId, ...opponentProviderIds];

  const chronological = await loadChronologicalFixturesForTeams({
    teamProviderIds: teamIds,
    beforeAt: input.beforeAt,
  });

  const ratingMap: EloRatingMap = new Map();
  const opponentAtKickoff = new Map<number, number>();

  for (const fixture of chronological) {
    const homePid = fixture.home_team.provider_id;
    const awayPid = fixture.away_team.provider_id;
    const leaguePid = fixture.league?.provider_id ?? 0;

    const involvesTeam =
      homePid === input.teamProviderId || awayPid === input.teamProviderId;

    if (involvesTeam) {
      const oppPid = homePid === input.teamProviderId ? awayPid : homePid;
      opponentAtKickoff.set(
        fixture.provider_id,
        getRatingFromMap(ratingMap, oppPid)
      );
    }

    applyEloResultToMap(ratingMap, {
      homeTeamProviderId: homePid,
      awayTeamProviderId: awayPid,
      homeGoals: fixture.score_home,
      awayGoals: fixture.score_away,
      leagueProviderId: leaguePid,
    });
  }

  return opponentAtKickoff;
}
