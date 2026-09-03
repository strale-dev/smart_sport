import { cached } from "@/lib/redis/cache";
import { analyticsFormKey, analyticsH2hKey, CACHE_TTL } from "@/lib/redis/keys";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FormMatchResult,
  FormScope,
  FormSnapshot,
  H2HMeeting,
  H2HScope,
  H2HSummary,
} from "@/types/domain";

const TERMINAL_STATUSES = ["FT", "AET", "PEN"] as const;
const FORM_FRESH_SECONDS = 6 * 3_600;
const H2H_FRESH_SECONDS = 6 * 3_600;

type TeamFixtureRow = {
  provider_id: number;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  home_team: { provider_id: number; name: string } | null;
  away_team: { provider_id: number; name: string } | null;
  league: { provider_id: number; name: string } | null;
};

function resultForTeam(
  row: TeamFixtureRow,
  teamProviderId: number
): FormMatchResult | null {
  const home = row.home_team;
  const away = row.away_team;
  if (!home || !away) {
    return null;
  }

  const isHome = home.provider_id === teamProviderId;
  const isAway = away.provider_id === teamProviderId;
  if (!isHome && !isAway) {
    return null;
  }

  const goalsFor = isHome ? row.score_home : row.score_away;
  const goalsAgainst = isHome ? row.score_away : row.score_home;
  if (goalsFor === null || goalsAgainst === null) {
    return null;
  }

  let result: "W" | "D" | "L" = "D";
  if (goalsFor > goalsAgainst) {
    result = "W";
  } else if (goalsFor < goalsAgainst) {
    result = "L";
  }

  return {
    fixtureExternalId: row.provider_id,
    opponentName: isHome ? away.name : home.name,
    kickoffAt: row.kickoff_at,
    result,
    goalsFor,
    goalsAgainst,
    isHome,
  };
}

function aggregateForm(
  results: FormMatchResult[],
  scope: FormScope,
  requestedMatches: number
): FormSnapshot {
  const wins = results.filter((entry) => entry.result === "W").length;
  const draws = results.filter((entry) => entry.result === "D").length;
  const losses = results.filter((entry) => entry.result === "L").length;
  const goalsFor = results.reduce((sum, entry) => sum + entry.goalsFor, 0);
  const goalsAgainst = results.reduce(
    (sum, entry) => sum + entry.goalsAgainst,
    0
  );
  const cleanSheets = results.filter(
    (entry) => entry.goalsAgainst === 0
  ).length;
  const points = wins * 3 + draws;
  const ppg =
    results.length > 0 ? Number((points / results.length).toFixed(2)) : null;

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    ppg,
    matches: requestedMatches,
    scope,
    results,
  };
}

async function getTeamUuid(teamProviderId: number): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", teamProviderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve team ${teamProviderId}: ${error.message}`
    );
  }

  return data?.id ?? null;
}

async function getLeagueUuid(leagueProviderId: number): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("leagues")
    .select("id")
    .eq("provider_id", leagueProviderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve league ${leagueProviderId}: ${error.message}`
    );
  }

  return data?.id ?? null;
}

async function upsertFormSnapshot(
  teamUuid: string,
  snapshot: FormSnapshot
): Promise<void> {
  const client = createAdminClient();
  const points = snapshot.wins * 3 + snapshot.draws;

  const { error } = await client.from("form_snapshots").insert({
    team_id: teamUuid,
    scope: snapshot.scope,
    matches: snapshot.matches,
    wins: snapshot.wins,
    draws: snapshot.draws,
    losses: snapshot.losses,
    goals_for: snapshot.goalsFor,
    goals_against: snapshot.goalsAgainst,
    clean_sheets: snapshot.cleanSheets,
    failed_to_score: snapshot.results.filter((entry) => entry.goalsFor === 0)
      .length,
    points,
    ppg: snapshot.ppg,
  });

  if (error) {
    throw new Error(`Failed to upsert form snapshot: ${error.message}`);
  }
}

async function queryTeamFixtures(
  teamUuid: string,
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
    throw new Error(`Failed to query team fixtures: ${error.message}`);
  }

  return (data ?? []) as TeamFixtureRow[];
}

export async function computeRecentForm(
  teamProviderId: number,
  options: { matches: 5 | 10; scope?: FormScope }
): Promise<FormSnapshot> {
  const scope = options.scope ?? "ALL";
  const teamUuid = await getTeamUuid(teamProviderId);
  if (!teamUuid) {
    return aggregateForm([], scope, options.matches);
  }

  const rows = await queryTeamFixtures(teamUuid, scope, options.matches);
  const results: FormMatchResult[] = [];

  for (const row of rows) {
    const entry = resultForTeam(row, teamProviderId);
    if (!entry) {
      continue;
    }
    results.push(entry);
    if (results.length >= options.matches) {
      break;
    }
  }

  const snapshot = aggregateForm(results, scope, options.matches);

  if (results.length > 0) {
    await upsertFormSnapshot(teamUuid, snapshot);
  }

  return snapshot;
}

function canonicalTeamPair(
  teamAUuid: string,
  teamBUuid: string
): [string, string] {
  return teamAUuid < teamBUuid
    ? [teamAUuid, teamBUuid]
    : [teamBUuid, teamAUuid];
}

async function queryH2HFixtures(
  teamAUuid: string,
  teamBUuid: string,
  windowSize: number,
  scope: H2HScope,
  leagueUuid: string | null
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
    .or(
      `and(home_team_id.eq.${teamAUuid},away_team_id.eq.${teamBUuid}),and(home_team_id.eq.${teamBUuid},away_team_id.eq.${teamAUuid})`
    )
    .order("kickoff_at", { ascending: false })
    .limit(windowSize * 2);

  if (scope === "SAME_COMP" && leagueUuid) {
    query = query.eq("league_id", leagueUuid);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to query H2H fixtures: ${error.message}`);
  }

  return ((data ?? []) as TeamFixtureRow[]).slice(0, windowSize);
}

async function upsertH2hSummary(
  teamAUuid: string,
  teamBUuid: string,
  leagueUuid: string | null,
  summary: H2HSummary
): Promise<void> {
  const [canonicalA, canonicalB] = canonicalTeamPair(teamAUuid, teamBUuid);
  const client = createAdminClient();

  const { error } = await client.from("h2h_summaries").insert({
    team_a_id: canonicalA,
    team_b_id: canonicalB,
    scope: summary.scope,
    league_id: summary.scope === "SAME_COMP" ? leagueUuid : null,
    window_size: summary.windowSize,
    team_a_wins: summary.teamAWins,
    team_b_wins: summary.teamBWins,
    draws: summary.draws,
    team_a_goals: summary.teamAGoals,
    team_b_goals: summary.teamBGoals,
  });

  if (error) {
    throw new Error(`Failed to upsert H2H summary: ${error.message}`);
  }
}

export async function computeH2H(
  teamAProviderId: number,
  teamBProviderId: number,
  options: {
    windowSize?: number;
    scope?: H2HScope;
    leagueProviderId?: number | null;
  }
): Promise<H2HSummary> {
  const windowSize = options.windowSize ?? 10;
  const scope = options.scope ?? "ALL";
  const teamAUuid = await getTeamUuid(teamAProviderId);
  const teamBUuid = await getTeamUuid(teamBProviderId);

  if (!teamAUuid || !teamBUuid) {
    return {
      teamAExternalId: teamAProviderId,
      teamBExternalId: teamBProviderId,
      teamAWins: 0,
      teamBWins: 0,
      draws: 0,
      teamAGoals: 0,
      teamBGoals: 0,
      windowSize,
      scope,
      meetings: [],
    };
  }

  const leagueUuid =
    scope === "SAME_COMP" && options.leagueProviderId
      ? await getLeagueUuid(options.leagueProviderId)
      : null;

  const rows = await queryH2HFixtures(
    teamAUuid,
    teamBUuid,
    windowSize,
    scope,
    leagueUuid
  );

  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  let teamAGoals = 0;
  let teamBGoals = 0;

  const meetings: H2HMeeting[] = rows.map((row) => {
    const home = row.home_team!;
    const away = row.away_team!;
    const homeScore = row.score_home;
    const awayScore = row.score_away;

    if (homeScore !== null && awayScore !== null) {
      const homeIsA = home.provider_id === teamAProviderId;
      const aGoals = homeIsA ? homeScore : awayScore;
      const bGoals = homeIsA ? awayScore : homeScore;
      teamAGoals += aGoals;
      teamBGoals += bGoals;

      if (aGoals > bGoals) {
        teamAWins += 1;
      } else if (aGoals < bGoals) {
        teamBWins += 1;
      } else {
        draws += 1;
      }
    }

    return {
      fixtureExternalId: row.provider_id,
      kickoffAt: row.kickoff_at,
      homeTeamName: home.name,
      awayTeamName: away.name,
      homeScore,
      awayScore,
      leagueName: row.league?.name ?? null,
    };
  });

  const summary: H2HSummary = {
    teamAExternalId: teamAProviderId,
    teamBExternalId: teamBProviderId,
    teamAWins,
    teamBWins,
    draws,
    teamAGoals,
    teamBGoals,
    windowSize,
    scope,
    meetings,
  };

  if (meetings.length > 0) {
    await upsertH2hSummary(teamAUuid, teamBUuid, leagueUuid, summary);
  }

  return summary;
}

export async function getRecentForm(
  teamProviderId: number,
  options: { matches: 5 | 10; scope?: FormScope }
): Promise<FormSnapshot> {
  const scope = options.scope ?? "ALL";
  const result = await cached({
    key: analyticsFormKey(teamProviderId, scope, options.matches),
    freshTtlSeconds: FORM_FRESH_SECONDS,
    staleTtlSeconds: CACHE_TTL.standingsStale,
    fn: () => computeRecentForm(teamProviderId, options),
  });

  return result.value;
}

export async function getH2H(
  teamAProviderId: number,
  teamBProviderId: number,
  options: {
    windowSize?: number;
    scope?: H2HScope;
    leagueProviderId?: number | null;
  }
): Promise<H2HSummary> {
  const windowSize = options.windowSize ?? 10;
  const scope = options.scope ?? "ALL";
  const result = await cached({
    key: analyticsH2hKey(
      teamAProviderId,
      teamBProviderId,
      scope,
      windowSize,
      options.leagueProviderId
    ),
    freshTtlSeconds: H2H_FRESH_SECONDS,
    staleTtlSeconds: CACHE_TTL.standingsStale,
    fn: () => computeH2H(teamAProviderId, teamBProviderId, options),
  });

  return result.value;
}

export async function refreshAnalyticsForUpcomingFixtures(): Promise<{
  formsRefreshed: number;
  h2hRefreshed: number;
}> {
  const client = createAdminClient();
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const { data: fixtures, error } = await client
    .from("fixtures")
    .select(
      `
      provider_id,
      home_team:teams!fixtures_home_team_id_fkey (provider_id),
      away_team:teams!fixtures_away_team_id_fkey (provider_id),
      league:leagues (provider_id)
    `
    )
    .gte("kickoff_at", from)
    .lte("kickoff_at", to);

  if (error) {
    throw new Error(`Failed to load upcoming fixtures: ${error.message}`);
  }

  const teamIds = new Set<number>();
  const pairs = new Set<string>();

  for (const fixture of fixtures ?? []) {
    const home = Array.isArray(fixture.home_team)
      ? fixture.home_team[0]
      : fixture.home_team;
    const away = Array.isArray(fixture.away_team)
      ? fixture.away_team[0]
      : fixture.away_team;
    const league = Array.isArray(fixture.league)
      ? fixture.league[0]
      : fixture.league;

    if (home?.provider_id) {
      teamIds.add(home.provider_id);
    }
    if (away?.provider_id) {
      teamIds.add(away.provider_id);
    }
    if (home?.provider_id && away?.provider_id) {
      const key = [home.provider_id, away.provider_id].sort().join(":");
      pairs.add(`${key}:${league?.provider_id ?? "all"}`);
    }
  }

  let formsRefreshed = 0;
  for (const teamId of teamIds) {
    await computeRecentForm(teamId, { matches: 5, scope: "ALL" });
    await computeRecentForm(teamId, { matches: 10, scope: "ALL" });
    formsRefreshed += 1;
  }

  let h2hRefreshed = 0;
  for (const pairKey of pairs) {
    const [a, b, leaguePart] = pairKey.split(":");
    const teamA = Number(a);
    const teamB = Number(b);
    const leagueProviderId =
      leaguePart !== "all" ? Number(leaguePart) : undefined;

    await computeH2H(teamA, teamB, { windowSize: 10, scope: "ALL" });
    if (leagueProviderId) {
      await computeH2H(teamA, teamB, {
        windowSize: 10,
        scope: "SAME_COMP",
        leagueProviderId,
      });
    }
    h2hRefreshed += 1;
  }

  return { formsRefreshed, h2hRefreshed };
}
