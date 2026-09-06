import {
  aggregateForm,
  collectFormResults,
  type TeamFixtureRow,
} from "@/lib/analytics/compute-form";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormScope } from "@/types/domain";

const TERMINAL_STATUSES = ["FT", "AET", "PEN"] as const;

export async function queryTeamFixturesBefore(
  teamUuid: string,
  beforeAt: string,
  scope: FormScope,
  limit: number
): Promise<TeamFixtureRow[]> {
  const client = createAdminClient();
  let query = client
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
    .in("status", [...TERMINAL_STATUSES])
    .lt("kickoff_at", beforeAt)
    .order("kickoff_at", { ascending: false })
    .limit(limit * 3);

  if (scope === "HOME") {
    query = query.eq("home_team_id", teamUuid);
  } else if (scope === "AWAY") {
    query = query.eq("away_team_id", teamUuid);
  } else {
    query = query.or(`home_team_id.eq.${teamUuid},away_team_id.eq.${teamUuid}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to query point-in-time fixtures: ${error.message}`);
  }

  return (data ?? []) as TeamFixtureRow[];
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
    .in("status", [...TERMINAL_STATUSES])
    .lt("kickoff_at", beforeAt)
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
  const client = createAdminClient();
  const { data: fixtures, error } = await client
    .from("fixtures")
    .select("id, home_team_id, away_team_id")
    .in("status", [...TERMINAL_STATUSES])
    .lt("kickoff_at", beforeAt)
    .or(`home_team_id.eq.${teamUuid},away_team_id.eq.${teamUuid}`)
    .order("kickoff_at", { ascending: false })
    .limit(sampleSize * 2);

  if (error) {
    throw new Error(`Failed to query xG fixture window: ${error.message}`);
  }

  const fixtureRows = fixtures ?? [];
  if (fixtureRows.length === 0) {
    return { xgForAvg: null, xgAgainstAvg: null, samples: 0 };
  }

  const fixtureIds = fixtureRows.map((row) => row.id);
  const { data: stats, error: statsError } = await client
    .from("fixture_statistics")
    .select("fixture_id, team_id, expected_goals")
    .in("fixture_id", fixtureIds);

  if (statsError) {
    throw new Error(`Failed to query xG stats: ${statsError.message}`);
  }

  const statsByFixture = new Map<
    string,
    Array<{ team_id: string; expected_goals: number | null }>
  >();
  for (const row of stats ?? []) {
    const entries = statsByFixture.get(row.fixture_id) ?? [];
    entries.push({
      team_id: row.team_id,
      expected_goals:
        row.expected_goals !== null ? Number(row.expected_goals) : null,
    });
    statsByFixture.set(row.fixture_id, entries);
  }

  const xgForValues: number[] = [];
  const xgAgainstValues: number[] = [];

  for (const fixture of fixtureRows) {
    const entries = statsByFixture.get(fixture.id) ?? [];
    const teamStat = entries.find((entry) => entry.team_id === teamUuid);
    const opponentStat = entries.find((entry) => entry.team_id !== teamUuid);
    if (
      teamStat?.expected_goals == null ||
      opponentStat?.expected_goals == null
    ) {
      continue;
    }
    xgForValues.push(teamStat.expected_goals);
    xgAgainstValues.push(opponentStat.expected_goals);
    if (xgForValues.length >= sampleSize) {
      break;
    }
  }

  if (xgForValues.length === 0) {
    return { xgForAvg: null, xgAgainstAvg: null, samples: 0 };
  }

  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    xgForAvg: Number(average(xgForValues).toFixed(2)),
    xgAgainstAvg: Number(average(xgAgainstValues).toFixed(2)),
    samples: xgForValues.length,
  };
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
  teamCount: number | null;
}> {
  const client = createAdminClient();
  let query = client
    .from("fixtures")
    .select("home_team_id, away_team_id, score_home, score_away")
    .eq("league_id", input.leagueUuid)
    .in("status", [...TERMINAL_STATUSES])
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

  return {
    homeRank: rankByTeam.get(input.homeTeamUuid) ?? null,
    awayRank: rankByTeam.get(input.awayTeamUuid) ?? null,
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
    .in("status", [...TERMINAL_STATUSES])
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
