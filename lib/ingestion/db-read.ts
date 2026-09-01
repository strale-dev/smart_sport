import { getIngestionConfig } from "@/lib/ingestion/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Fixture,
  League,
  Season,
  StandingsGroup,
  Team,
  TeamRef,
} from "@/types/domain";

type FixtureRow = {
  provider_id: number;
  kickoff_at: string;
  status: Fixture["status"];
  minute: number | null;
  referee: string | null;
  round: string | null;
  score_home: number | null;
  score_away: number | null;
  ht_home: number | null;
  ht_away: number | null;
  ft_home: number | null;
  ft_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  home_team: {
    provider_id: number;
    name: string;
    code: string | null;
    logo_url: string | null;
    is_national: boolean;
  } | null;
  away_team: {
    provider_id: number;
    name: string;
    code: string | null;
    logo_url: string | null;
    is_national: boolean;
  } | null;
  league: {
    provider_id: number;
    name: string;
    type: string | null;
    country_name: string | null;
    logo_url: string | null;
  } | null;
  season: {
    year: number;
  } | null;
  venue: {
    provider_id: number | null;
    name: string;
    city: string | null;
    capacity: number | null;
    surface: string | null;
    image_url: string | null;
  } | null;
};

function mapTeamRefFromRow(
  row:
    | FixtureRow["home_team"]
    | FixtureRow["away_team"]
    | {
        provider_id: number;
        name: string;
        code: string | null;
        logo_url: string | null;
        is_national: boolean;
      }
    | null
): TeamRef {
  return {
    externalId: row?.provider_id ?? 0,
    name: row?.name ?? "Unknown",
    code: row?.code ?? null,
    logoUrl: row?.logo_url ?? null,
    isNational: row?.is_national ?? false,
  };
}

function mapFixtureRow(row: FixtureRow): Fixture {
  return {
    externalId: row.provider_id,
    league: {
      externalId: row.league?.provider_id ?? 0,
      name: row.league?.name ?? "Unknown",
      type: row.league?.type ?? null,
      country: row.league?.country_name
        ? {
            externalId: null,
            code: null,
            name: row.league.country_name,
            flagUrl: null,
          }
        : null,
      logoUrl: row.league?.logo_url ?? null,
    },
    seasonYear: row.season?.year ?? null,
    homeTeam: mapTeamRefFromRow(row.home_team),
    awayTeam: mapTeamRefFromRow(row.away_team),
    kickoffAt: row.kickoff_at,
    status: row.status,
    minute: row.minute,
    score: {
      home: row.score_home,
      away: row.score_away,
      halftimeHome: row.ht_home,
      halftimeAway: row.ht_away,
      fulltimeHome: row.ft_home,
      fulltimeAway: row.ft_away,
      extratimeHome: row.et_home,
      extratimeAway: row.et_away,
      penaltyHome: row.pen_home,
      penaltyAway: row.pen_away,
    },
    venue: row.venue
      ? {
          externalId: row.venue.provider_id,
          name: row.venue.name,
          city: row.venue.city,
          capacity: row.venue.capacity,
          surface: row.venue.surface,
          imageUrl: row.venue.image_url,
        }
      : null,
    referee: row.referee,
    round: row.round,
  };
}

const FIXTURE_SELECT = `
  provider_id,
  kickoff_at,
  status,
  minute,
  referee,
  round,
  score_home,
  score_away,
  ht_home,
  ht_away,
  ft_home,
  ft_away,
  et_home,
  et_away,
  pen_home,
  pen_away,
  home_team:teams!fixtures_home_team_id_fkey (
    provider_id,
    name,
    code,
    logo_url,
    is_national
  ),
  away_team:teams!fixtures_away_team_id_fkey (
    provider_id,
    name,
    code,
    logo_url,
    is_national
  ),
  league:leagues (
    provider_id,
    name,
    type,
    country_name,
    logo_url
  ),
  season:seasons (
    year
  ),
  venue:venues (
    provider_id,
    name,
    city,
    capacity,
    surface,
    image_url
  )
`;

function nextUtcDate(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export async function readFixturesForDateFromDb(
  date: string
): Promise<Fixture[]> {
  const client = createAdminClient();
  const config = getIngestionConfig();
  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .in(
      "league_id",
      leagues.map((league) => league.id)
    )
    .gte("kickoff_at", `${date}T00:00:00.000Z`)
    .lt("kickoff_at", nextUtcDate(date))
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read fixtures for ${date}: ${error.message}`);
  }

  return ((data ?? []) as FixtureRow[]).map(mapFixtureRow);
}

export async function readFixtureByProviderIdFromDb(
  providerId: number
): Promise<Fixture | null> {
  const client = createAdminClient();

  const { data, error } = await client
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read fixture ${providerId}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFixtureRow(data as FixtureRow);
}

export async function readLiveFixturesFromDb(): Promise<Fixture[]> {
  const client = createAdminClient();
  const config = getIngestionConfig();
  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return [];
  }

  const { data, error } = await client
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .in(
      "league_id",
      leagues.map((league) => league.id)
    )
    .eq("is_live", true)
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read live fixtures: ${error.message}`);
  }

  return ((data ?? []) as FixtureRow[]).map(mapFixtureRow);
}

export async function readTeamByProviderIdFromDb(
  providerId: number
): Promise<Team | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("teams")
    .select(
      `
      provider_id,
      name,
      code,
      founded,
      is_national,
      logo_url,
      country:countries (
        name,
        code,
        flag_url
      ),
      venue:venues (
        provider_id,
        name,
        city,
        capacity,
        surface,
        image_url
      )
    `
    )
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read team ${providerId}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const country = Array.isArray(data.country) ? data.country[0] : data.country;
  const venue = Array.isArray(data.venue) ? data.venue[0] : data.venue;

  return {
    externalId: data.provider_id,
    name: data.name,
    code: data.code,
    country: country
      ? {
          externalId: country.code,
          code: country.code,
          name: country.name,
          flagUrl: country.flag_url,
        }
      : null,
    founded: data.founded,
    isNational: data.is_national,
    logoUrl: data.logo_url,
    venue: venue
      ? {
          externalId: venue.provider_id,
          name: venue.name,
          city: venue.city,
          capacity: venue.capacity,
          surface: venue.surface,
          imageUrl: venue.image_url,
        }
      : null,
  };
}

export async function readLeagueDetailFromDb(providerId: number): Promise<{
  league: League;
  seasons: Season[];
} | null> {
  const client = createAdminClient();

  const { data: leagueRow, error } = await client
    .from("leagues")
    .select(
      `
      id,
      provider_id,
      name,
      type,
      country_name,
      logo_url,
      is_active,
      country:countries (
        name,
        code,
        flag_url
      )
    `
    )
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read league ${providerId}: ${error.message}`);
  }

  if (!leagueRow) {
    return null;
  }

  const country = Array.isArray(leagueRow.country)
    ? leagueRow.country[0]
    : leagueRow.country;

  const { data: seasons, error: seasonsError } = await client
    .from("seasons")
    .select("year, start_date, end_date, is_current, league_id")
    .eq("league_id", leagueRow.id)
    .order("year", { ascending: false });

  if (seasonsError) {
    throw new Error(
      `Failed to read seasons for league ${providerId}: ${seasonsError.message}`
    );
  }

  return {
    league: {
      externalId: leagueRow.provider_id,
      name: leagueRow.name,
      type: leagueRow.type,
      country: country
        ? {
            externalId: country.code,
            code: country.code,
            name: country.name,
            flagUrl: country.flag_url,
          }
        : leagueRow.country_name
          ? {
              externalId: null,
              code: null,
              name: leagueRow.country_name,
              flagUrl: null,
            }
          : null,
      logoUrl: leagueRow.logo_url,
      isActive: leagueRow.is_active,
    },
    seasons: (seasons ?? []).map((season) => ({
      leagueExternalId: providerId,
      year: season.year,
      startDate: season.start_date,
      endDate: season.end_date,
      isCurrent: season.is_current,
    })),
  };
}

export async function readStandingsFromDb(
  leagueProviderId: number,
  seasonYear: number
): Promise<StandingsGroup[]> {
  const client = createAdminClient();

  const { data: league } = await client
    .from("leagues")
    .select("id")
    .eq("provider_id", leagueProviderId)
    .maybeSingle();

  if (!league) {
    return [];
  }

  const { data: season } = await client
    .from("seasons")
    .select("id")
    .eq("league_id", league.id)
    .eq("year", seasonYear)
    .maybeSingle();

  if (!season) {
    return [];
  }

  const { data, error } = await client
    .from("standings")
    .select(
      `
      rank,
      points,
      goal_diff,
      group_name,
      form,
      played,
      win,
      draw,
      lose,
      goals_for,
      goals_against,
      team:teams (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      )
    `
    )
    .eq("league_id", league.id)
    .eq("season_id", season.id)
    .order("rank", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to read standings for league ${leagueProviderId}: ${error.message}`
    );
  }

  const groups = new Map<string, StandingsGroup>();

  for (const row of data ?? []) {
    const groupName = row.group_name ?? "Overall";
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    const group =
      groups.get(groupName) ??
      ({
        leagueExternalId: leagueProviderId,
        seasonYear,
        groupName,
        rows: [],
      } satisfies StandingsGroup);

    group.rows.push({
      rank: row.rank ?? 0,
      team: mapTeamRefFromRow(team),
      points: row.points,
      goalsDiff: row.goal_diff,
      groupName: row.group_name,
      form: row.form,
      played: row.played,
      win: row.win,
      draw: row.draw,
      lose: row.lose,
      goalsFor: row.goals_for,
      goalsAgainst: row.goals_against,
    });

    groups.set(groupName, group);
  }

  return [...groups.values()];
}

export async function readSeasonsByLeagueFromDb(
  leagueProviderId: number
): Promise<Season[]> {
  const detail = await readLeagueDetailFromDb(leagueProviderId);
  return detail?.seasons ?? [];
}

export type FixtureStandingsInfo = {
  homeRank: number | null;
  awayRank: number | null;
  teamCount: number | null;
};

export async function readLeaguePrestigeMap(): Promise<Map<number, number>> {
  const client = createAdminClient();
  const config = getIngestionConfig();

  const { data, error } = await client
    .from("leagues")
    .select("provider_id, prestige_score")
    .in("provider_id", [...config.leagueProviderIds]);

  if (error) {
    throw new Error(`Failed to read league prestige scores: ${error.message}`);
  }

  const map = new Map<number, number>();
  for (const row of data ?? []) {
    map.set(row.provider_id, Number(row.prestige_score ?? 0));
  }

  return map;
}

export async function readStandingsRanksForFixtures(
  fixtures: Fixture[]
): Promise<Map<number, FixtureStandingsInfo>> {
  const result = new Map<number, FixtureStandingsInfo>();
  if (fixtures.length === 0) {
    return result;
  }

  const leagueSeasonKeys = new Map<
    string,
    { leagueProviderId: number; seasonYear: number }
  >();

  for (const fixture of fixtures) {
    if (fixture.seasonYear == null) {
      continue;
    }

    const key = `${fixture.league.externalId}:${fixture.seasonYear}`;
    leagueSeasonKeys.set(key, {
      leagueProviderId: fixture.league.externalId,
      seasonYear: fixture.seasonYear,
    });
  }

  const standingsCache = new Map<string, StandingsGroup[]>();
  await Promise.all(
    [...leagueSeasonKeys.entries()].map(
      async ([key, { leagueProviderId, seasonYear }]) => {
        const groups = await readStandingsFromDb(leagueProviderId, seasonYear);
        standingsCache.set(key, groups);
      }
    )
  );

  for (const fixture of fixtures) {
    if (fixture.seasonYear == null) {
      result.set(fixture.externalId, {
        homeRank: null,
        awayRank: null,
        teamCount: null,
      });
      continue;
    }

    const key = `${fixture.league.externalId}:${fixture.seasonYear}`;
    const groups = standingsCache.get(key) ?? [];
    const overall =
      groups.find((group) => group.groupName === "Overall") ?? groups[0];

    if (!overall || overall.rows.length === 0) {
      result.set(fixture.externalId, {
        homeRank: null,
        awayRank: null,
        teamCount: null,
      });
      continue;
    }

    const teamCount = overall.rows.length;
    const homeRow = overall.rows.find(
      (row) => row.team.externalId === fixture.homeTeam.externalId
    );
    const awayRow = overall.rows.find(
      (row) => row.team.externalId === fixture.awayTeam.externalId
    );

    result.set(fixture.externalId, {
      homeRank: homeRow?.rank ?? null,
      awayRank: awayRow?.rank ?? null,
      teamCount,
    });
  }

  return result;
}

type H2hPairLookup = {
  fixtureExternalId: number;
  teamAId: string;
  teamBId: string;
};

function canonicalTeamPair(teamAId: string, teamBId: string): [string, string] {
  return teamAId < teamBId ? [teamAId, teamBId] : [teamBId, teamAId];
}

export async function readH2hInterestForFixtures(
  fixtures: Fixture[]
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (fixtures.length === 0) {
    return result;
  }

  const client = createAdminClient();
  const providerIds = new Set<number>();

  for (const fixture of fixtures) {
    providerIds.add(fixture.homeTeam.externalId);
    providerIds.add(fixture.awayTeam.externalId);
  }

  const { data: teams, error: teamsError } = await client
    .from("teams")
    .select("id, provider_id")
    .in("provider_id", [...providerIds]);

  if (teamsError) {
    throw new Error(
      `Failed to read teams for H2H lookup: ${teamsError.message}`
    );
  }

  const uuidByProvider = new Map<number, string>();
  for (const team of teams ?? []) {
    uuidByProvider.set(team.provider_id, team.id);
  }

  const pairLookups: H2hPairLookup[] = [];
  for (const fixture of fixtures) {
    const homeUuid = uuidByProvider.get(fixture.homeTeam.externalId);
    const awayUuid = uuidByProvider.get(fixture.awayTeam.externalId);
    if (!homeUuid || !awayUuid) {
      continue;
    }

    const [teamAId, teamBId] = canonicalTeamPair(homeUuid, awayUuid);
    pairLookups.push({
      fixtureExternalId: fixture.externalId,
      teamAId,
      teamBId,
    });
  }

  await Promise.all(
    pairLookups.map(async ({ fixtureExternalId, teamAId, teamBId }) => {
      const { data, error } = await client
        .from("h2h_summaries")
        .select("team_a_wins, team_b_wins, draws, window_size")
        .eq("team_a_id", teamAId)
        .eq("team_b_id", teamBId)
        .eq("scope", "ALL")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Failed to read H2H summary for fixture ${fixtureExternalId}: ${error.message}`
        );
      }

      if (!data?.window_size || data.window_size <= 0) {
        return;
      }

      const meetings =
        (data.team_a_wins ?? 0) + (data.team_b_wins ?? 0) + (data.draws ?? 0);
      result.set(fixtureExternalId, meetings / data.window_size);
    })
  );

  return result;
}

export type PredictionChangeSummary = {
  fixtureExternalId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeWinDelta: number;
  updatedAt: string;
};

export async function readRecentPredictionChanges(
  limit = 5
): Promise<PredictionChangeSummary[]> {
  const client = createAdminClient();

  const { data: latestPredictions, error } = await client
    .from("predictions")
    .select(
      `
      id,
      home_win_prob,
      created_at,
      fixture:fixtures (
        provider_id,
        home_team:teams!fixtures_home_team_id_fkey (name),
        away_team:teams!fixtures_away_team_id_fkey (name)
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit * 4);

  if (error) {
    throw new Error(`Failed to read recent predictions: ${error.message}`);
  }

  const byFixture = new Map<
    number,
    Array<{
      homeWinProb: number;
      createdAt: string;
      homeTeamName: string;
      awayTeamName: string;
    }>
  >();

  for (const row of latestPredictions ?? []) {
    const fixture = Array.isArray(row.fixture) ? row.fixture[0] : row.fixture;
    if (!fixture) {
      continue;
    }

    const homeTeam = Array.isArray(fixture.home_team)
      ? fixture.home_team[0]
      : fixture.home_team;
    const awayTeam = Array.isArray(fixture.away_team)
      ? fixture.away_team[0]
      : fixture.away_team;

    const fixtureExternalId = fixture.provider_id;
    const entries = byFixture.get(fixtureExternalId) ?? [];
    entries.push({
      homeWinProb: Number(row.home_win_prob),
      createdAt: row.created_at,
      homeTeamName: homeTeam?.name ?? "Home",
      awayTeamName: awayTeam?.name ?? "Away",
    });
    byFixture.set(fixtureExternalId, entries);
  }

  const summaries: PredictionChangeSummary[] = [];

  for (const [fixtureExternalId, entries] of byFixture) {
    if (entries.length < 2) {
      continue;
    }

    const [latest, previous] = entries;
    const homeWinDelta = latest.homeWinProb - previous.homeWinProb;
    if (Math.abs(homeWinDelta) < 0.01) {
      continue;
    }

    summaries.push({
      fixtureExternalId,
      homeTeamName: latest.homeTeamName,
      awayTeamName: latest.awayTeamName,
      homeWinDelta,
      updatedAt: latest.createdAt,
    });
  }

  return summaries.slice(0, limit);
}
