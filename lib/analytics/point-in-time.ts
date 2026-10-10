import {
  aggregateForm,
  collectFormResults,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import {
  queryCompletedTeamFixtures,
  TERMINAL_FIXTURE_STATUSES,
} from "@/lib/analytics/team-history-query";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormScope } from "@/types/domain";

export async function queryTeamFixturesBefore(
  teamUuid: string,
  beforeAt: string,
  scope: FormScope,
  limit: number
): Promise<TeamFixtureRow[]> {
  const { rows } = await queryCompletedTeamFixtures({
    teamUuid,
    beforeAt,
    scope,
    limit,
    order: "desc",
    fetchMultiplier: 3,
  });

  return rows;
}

export async function computeFormBefore(
  teamProviderId: number,
  teamUuid: string,
  beforeAt: string,
  matches: 5 | 10,
  scope: FormScope = "ALL"
) {
  const rows = await queryTeamFixturesBefore(
    teamUuid,
    beforeAt,
    scope,
    matches
  );
  const results = collectFormResults(rows, teamProviderId, matches);
  return aggregateForm(results, scope, matches);
}

export async function computeH2HBefore(
  teamAProviderId: number,
  teamBProviderId: number,
  teamAUuid: string,
  teamBUuid: string,
  beforeAt: string,
  windowSize = 10
) {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      provider_id,
      kickoff_at,
      score_home,
      score_away,
      home_team:teams!fixtures_home_team_id_fkey (provider_id, name),
      away_team:teams!fixtures_away_team_id_fkey (provider_id, name),
      league:leagues (provider_id, name)
    `
    )
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", beforeAt)
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .or(
      `and(home_team_id.eq.${teamAUuid},away_team_id.eq.${teamBUuid}),and(home_team_id.eq.${teamBUuid},away_team_id.eq.${teamAUuid})`
    )
    .order("kickoff_at", { ascending: false })
    .limit(windowSize);

  if (error) {
    throw new Error(`Failed to query point-in-time H2H: ${error.message}`);
  }

  return summarizeH2HMeetings(
    (data ?? []) as TeamFixtureRow[],
    teamAProviderId,
    teamBProviderId,
    windowSize,
    "ALL"
  );
}

export async function computeRestDaysBefore(
  teamUuid: string,
  beforeAt: string
): Promise<number | null> {
  const rows = await queryTeamFixturesBefore(teamUuid, beforeAt, "ALL", 1);
  const lastMatch = rows[0];
  if (!lastMatch) {
    return null;
  }

  const beforeMs = new Date(beforeAt).getTime();
  const lastMs = new Date(lastMatch.kickoff_at).getTime();
  const diffDays = (beforeMs - lastMs) / 86_400_000;
  return Number(Math.max(0, diffDays).toFixed(1));
}

export async function computeTeamXgAveragesBefore(
  teamUuid: string,
  beforeAt: string,
  sampleSize = 5
): Promise<{
  xgForAvg: number | null;
  xgAgainstAvg: number | null;
  samples: number;
}> {
  const { computeTeamXgAveragesFromBatch } =
    await import("@/lib/analytics/fixture-xg-batch");
  return computeTeamXgAveragesFromBatch({
    teamUuid,
    beforeAt,
    sampleSize,
  });
}

export async function computeLeagueRanksBefore(input: {
  leagueUuid: string;
  seasonUuid: string | null;
  homeTeamUuid: string;
  awayTeamUuid: string;
  beforeAt: string;
}): Promise<{
  homeRank: number | null;
  awayRank: number | null;
  homePoints: number | null;
  awayPoints: number | null;
  teamCount: number | null;
}> {
  const client = createAdminClient();
  let query = client
    .from("fixtures")
    .select("home_team_id, away_team_id, score_home, score_away")
    .eq("league_id", input.leagueUuid)
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .lt("kickoff_at", input.beforeAt);

  if (input.seasonUuid) {
    query = query.eq("season_id", input.seasonUuid);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to compute league ranks: ${error.message}`);
  }

  const points = new Map<string, { played: number; points: number }>();
  const ensureTeam = (teamId: string) => {
    if (!points.has(teamId)) {
      points.set(teamId, { played: 0, points: 0 });
    }
    return points.get(teamId)!;
  };

  for (const row of data ?? []) {
    if (row.score_home == null || row.score_away == null) {
      continue;
    }

    const home = ensureTeam(row.home_team_id);
    const away = ensureTeam(row.away_team_id);
    home.played += 1;
    away.played += 1;

    if (row.score_home > row.score_away) {
      home.points += 3;
    } else if (row.score_home < row.score_away) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  const table = [...points.entries()]
    .filter(([, stats]) => stats.played > 0)
    .sort((left, right) => right[1].points - left[1].points);

  const rankByTeam = new Map<string, number>();
  table.forEach(([teamId], index) => {
    rankByTeam.set(teamId, index + 1);
  });

  const homeStats = points.get(input.homeTeamUuid);
  const awayStats = points.get(input.awayTeamUuid);

  return {
    homeRank: rankByTeam.get(input.homeTeamUuid) ?? null,
    awayRank: rankByTeam.get(input.awayTeamUuid) ?? null,
    homePoints: homeStats?.played ? homeStats.points : null,
    awayPoints: awayStats?.played ? awayStats.points : null,
    teamCount: table.length > 0 ? table.length : null,
  };
}

export type TerminalFixtureRow = {
  id: string;
  provider_id: number;
  kickoff_at: string;
  status: string;
  score_home: number | null;
  score_away: number | null;
  home_team_id: string;
  away_team_id: string;
  league_id: string;
  season_id: string | null;
  home_team: { provider_id: number; elo_rating: number | null } | null;
  away_team: { provider_id: number; elo_rating: number | null } | null;
  league: { provider_id: number } | null;
};

export async function loadTerminalFixturesChronological(): Promise<
  TerminalFixtureRow[]
> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      kickoff_at,
      status,
      score_home,
      score_away,
      home_team_id,
      away_team_id,
      league_id,
      season_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id, elo_rating),
      away_team:teams!fixtures_away_team_id_fkey (provider_id, elo_rating),
      league:leagues (provider_id)
    `
    )
    .in("status", [...TERMINAL_FIXTURE_STATUSES])
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load terminal fixtures: ${error.message}`);
  }

  return (data ?? []) as TerminalFixtureRow[];
}

export async function loadUpcomingFixtures(limit = 20) {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select(
      `
      id,
      provider_id,
      kickoff_at,
      status,
      home_team_id,
      away_team_id,
      league_id,
      season_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id, elo_rating),
      away_team:teams!fixtures_away_team_id_fkey (provider_id, elo_rating),
      league:leagues (provider_id)
    `
    )
    .in("status", ["NS", "TBD"])
    .gte("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load upcoming fixtures: ${error.message}`);
  }

  return data ?? [];
}
