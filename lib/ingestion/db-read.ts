import { getIngestionConfig } from "@/lib/ingestion/config";
import { buildPlayerContributionBadges } from "@/lib/players/badges";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
  League,
  Lineup,
  LineupPlayer,
  Player,
  PlayerCareerEntry,
  PlayerFoot,
  PlayerMatchAppearance,
  PlayerPosition,
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

export async function readFixturesInRangeFromDb(
  fromDate: string,
  toDateExclusive: string
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
    .gte("kickoff_at", `${fromDate}T00:00:00.000Z`)
    .lt("kickoff_at", `${toDateExclusive}T00:00:00.000Z`)
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to read fixtures for range ${fromDate}..${toDateExclusive}: ${error.message}`
    );
  }

  return ((data ?? []) as FixtureRow[]).map(mapFixtureRow);
}

export type FollowedTeamRow = {
  id: string;
  providerId: number;
};

export async function readFollowedTeamsForUser(
  userId: string
): Promise<FollowedTeamRow[]> {
  const client = createAdminClient();

  const { data, error } = await client
    .from("follows")
    .select("team_id, team:teams!follows_team_id_fkey(provider_id)")
    .eq("user_id", userId)
    .eq("object_type", "TEAM")
    .not("team_id", "is", null);

  if (error) {
    throw new Error(`Failed to read followed teams: ${error.message}`);
  }

  return (data ?? []).flatMap((row) => {
    const teamId = row.team_id;
    const providerId = row.team?.provider_id;

    if (teamId == null || providerId == null) {
      return [];
    }

    return [{ id: teamId, providerId }];
  });
}

export async function readFollowedTeamIdsForUser(
  userId: string
): Promise<string[]> {
  const teams = await readFollowedTeamsForUser(userId);
  return teams.map((team) => team.id);
}

export async function readFixturesForTeamsInRangeFromDb(
  teamIds: string[],
  fromUtc: string,
  toUtcExclusive: string
): Promise<Fixture[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const client = createAdminClient();
  const config = getIngestionConfig();
  const { data: leagues } = await client
    .from("leagues")
    .select("id")
    .in("provider_id", [...config.leagueProviderIds]);

  if (!leagues?.length) {
    return [];
  }

  const quotedTeamIds = teamIds.map((teamId) => `"${teamId}"`).join(",");
  const teamScope = `home_team_id.in.(${quotedTeamIds}),away_team_id.in.(${quotedTeamIds})`;

  const { data, error } = await client
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .in(
      "league_id",
      leagues.map((league) => league.id)
    )
    .gte("kickoff_at", fromUtc)
    .lt("kickoff_at", toUtcExclusive)
    .or(teamScope)
    .order("kickoff_at", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to read fixtures for followed teams: ${error.message}`
    );
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

export async function readTeamIdByProviderIdFromDb(
  providerId: number
): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("teams")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read team id ${providerId}: ${error.message}`);
  }

  return data?.id ?? null;
}

function mapPlayerFoot(value: string | null): PlayerFoot {
  switch (value) {
    case "LEFT":
    case "RIGHT":
    case "BOTH":
      return value;
    default:
      return "UNKNOWN";
  }
}

function mapPlayerPosition(value: string | null): PlayerPosition | null {
  switch (value) {
    case "GK":
    case "DF":
    case "MF":
    case "FW":
      return value;
    default:
      return null;
  }
}

export async function readPlayerByProviderIdFromDb(
  providerId: number
): Promise<Player | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("players")
    .select(
      `
      provider_id,
      first_name,
      last_name,
      full_name,
      nationality,
      date_of_birth,
      height_cm,
      weight_kg,
      position,
      preferred_foot,
      photo_url,
      market_value_amount,
      market_value_currency
    `
    )
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read player ${providerId}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const history = await readCurrentClubForPlayer(client, data.provider_id);

  return {
    externalId: data.provider_id,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name,
    nationality: data.nationality,
    dateOfBirth: data.date_of_birth,
    heightCm: data.height_cm,
    weightKg: data.weight_kg,
    position: mapPlayerPosition(data.position),
    preferredFoot: mapPlayerFoot(data.preferred_foot),
    photoUrl: data.photo_url,
    currentTeam: history?.team ?? null,
    shirtNumber: history?.shirtNumber ?? null,
    marketValue:
      data.market_value_amount != null && data.market_value_currency
        ? {
            amount: Number(data.market_value_amount),
            currency: data.market_value_currency,
          }
        : null,
    averageRating: null,
  };
}

async function readCurrentClubForPlayer(
  client: ReturnType<typeof createAdminClient>,
  playerProviderId: number
): Promise<{ team: TeamRef; shirtNumber: number | null } | null> {
  const { data: playerRow, error: playerError } = await client
    .from("players")
    .select("id")
    .eq("provider_id", playerProviderId)
    .maybeSingle();

  if (playerError || !playerRow?.id) {
    return null;
  }

  const { data, error } = await client
    .from("player_team_history")
    .select(
      `
      shirt_number,
      team:teams!player_team_history_team_id_fkey (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      )
    `
    )
    .eq("player_id", playerRow.id)
    .is("left_on", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const teamRow = Array.isArray(data.team) ? data.team[0] : data.team;
  if (!teamRow) {
    return null;
  }

  return {
    team: mapTeamRefFromRow(teamRow),
    shirtNumber: data.shirt_number,
  };
}

export async function readPlayerIdByProviderIdFromDb(
  providerId: number
): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("players")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve player uuid ${providerId}: ${error.message}`
    );
  }

  return data?.id ?? null;
}

type PlayerMatchPerformanceRow = {
  minutes: number | null;
  rating: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  is_motm: boolean | null;
  team: {
    provider_id: number;
    name: string;
    code: string | null;
    logo_url: string | null;
    is_national: boolean;
  } | null;
  fixture: {
    provider_id: number;
    kickoff_at: string;
    status: Fixture["status"];
    score_home: number | null;
    score_away: number | null;
    home_team: FixtureRow["home_team"];
    away_team: FixtureRow["away_team"];
    league: FixtureRow["league"];
  } | null;
};

const FINISHED_MATCH_STATUSES = new Set<Fixture["status"]>([
  "FT",
  "AET",
  "PEN",
  "AWD",
  "WO",
]);

export async function readPlayerMatchHistoryFromDb(
  providerId: number,
  options: { limit: number; offset: number }
): Promise<{ items: PlayerMatchAppearance[]; total: number }> {
  const playerId = await readPlayerIdByProviderIdFromDb(providerId);

  if (!playerId) {
    return { items: [], total: 0 };
  }

  const client = createAdminClient();
  const { data: countRows, error: countError } = await client
    .from("player_match_performances")
    .select(
      `
      id,
      fixture:fixtures!inner (status)
    `
    )
    .eq("player_id", playerId)
    .in("fixture.status", [...FINISHED_MATCH_STATUSES]);

  if (countError) {
    throw new Error(
      `Failed to count player match history ${providerId}: ${countError.message}`
    );
  }

  const total = countRows?.length ?? 0;

  const { data, error } = await client
    .from("player_match_performances")
    .select(
      `
      minutes,
      rating,
      goals,
      assists,
      yellow_cards,
      red_cards,
      is_motm,
      team:teams!player_match_performances_team_id_fkey (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      ),
      fixture:fixtures!inner (
        provider_id,
        kickoff_at,
        status,
        score_home,
        score_away,
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
        league:leagues!fixtures_league_id_fkey (
          name,
          logo_url
        )
      )
    `
    )
    .eq("player_id", playerId)
    .in("fixture.status", [...FINISHED_MATCH_STATUSES])
    .order("kickoff_at", {
      referencedTable: "fixtures",
      ascending: false,
    })
    .range(options.offset, options.offset + options.limit - 1);

  if (error) {
    throw new Error(
      `Failed to read player match history ${providerId}: ${error.message}`
    );
  }

  const rows = (data ?? []) as PlayerMatchPerformanceRow[];
  const fixtureIds = rows
    .map((row) => row.fixture?.provider_id)
    .filter((value): value is number => value != null);
  const eventsByFixture = await readFixtureEventsForPlayerFromDb(
    fixtureIds,
    providerId
  );
  const player = await readPlayerByProviderIdFromDb(providerId);

  const items = rows.flatMap((row) => {
    if (!row.fixture || !row.team) {
      return [];
    }

    const homeTeam = mapTeamRefFromRow(row.fixture.home_team);
    const awayTeam = mapTeamRefFromRow(row.fixture.away_team);
    const team = mapTeamRefFromRow(row.team);
    const isHome = team.externalId === homeTeam.externalId;
    const opponent = isHome ? awayTeam : homeTeam;
    const goalsAgainst = isHome
      ? (row.fixture.score_away ?? 0)
      : (row.fixture.score_home ?? 0);
    const cleanSheet =
      (player?.position === "GK" || player?.position === "DF") &&
      goalsAgainst === 0 &&
      (row.minutes ?? 0) > 0;

    const events = eventsByFixture.get(row.fixture.provider_id) ?? [];
    const goals = row.goals ?? 0;
    const assists = row.assists ?? 0;
    const yellowCards = row.yellow_cards ?? 0;
    const redCards = row.red_cards ?? 0;

    return [
      {
        fixtureExternalId: row.fixture.provider_id,
        kickoffAt: row.fixture.kickoff_at,
        leagueName: row.fixture.league?.name ?? "Unknown",
        leagueLogoUrl: row.fixture.league?.logo_url ?? null,
        homeTeam,
        awayTeam,
        homeScore: row.fixture.score_home,
        awayScore: row.fixture.score_away,
        status: row.fixture.status,
        teamExternalId: team.externalId,
        opponent,
        isHome,
        minutes: row.minutes,
        rating: row.rating != null ? Number(row.rating) : null,
        goals,
        assists,
        yellowCards,
        redCards,
        cleanSheet,
        isMotm: row.is_motm ?? false,
        badges: buildPlayerContributionBadges({
          goals,
          assists,
          yellowCards,
          redCards,
          cleanSheet,
          isMotm: row.is_motm ?? false,
          events,
          playerExternalId: providerId,
          position: player?.position ?? null,
        }),
      } satisfies PlayerMatchAppearance,
    ];
  });

  return {
    items,
    total,
  };
}

async function readFixtureEventsForPlayerFromDb(
  fixtureProviderIds: number[],
  playerProviderId: number
): Promise<Map<number, FixtureEvent[]>> {
  if (fixtureProviderIds.length === 0) {
    return new Map();
  }

  const client = createAdminClient();
  const { data: fixtures, error: fixtureError } = await client
    .from("fixtures")
    .select("id, provider_id")
    .in("provider_id", fixtureProviderIds);

  if (fixtureError) {
    throw new Error(
      `Failed to resolve fixtures for player events: ${fixtureError.message}`
    );
  }

  const fixtureUuidByProviderId = new Map(
    (fixtures ?? []).map((fixture) => [fixture.provider_id, fixture.id])
  );
  const fixtureUuids = [...fixtureUuidByProviderId.values()];

  if (fixtureUuids.length === 0) {
    return new Map();
  }

  const { data: playerRow } = await client
    .from("players")
    .select("id")
    .eq("provider_id", playerProviderId)
    .maybeSingle();

  const playerUuid = playerRow?.id ?? null;

  const { data, error } = await client
    .from("fixture_events")
    .select(
      `
      minute,
      extra_minute,
      type,
      detail,
      comments,
      provider_event_id,
      player:players!fixture_events_player_id_fkey (provider_id),
      assist_player:players!fixture_events_assist_player_id_fkey (provider_id),
      team:teams!fixture_events_team_id_fkey (provider_id),
      fixture:fixtures!inner (provider_id)
    `
    )
    .in("fixture_id", fixtureUuids);

  if (error) {
    throw new Error(
      `Failed to read fixture events for player: ${error.message}`
    );
  }

  const grouped = new Map<number, FixtureEvent[]>();

  for (const row of data ?? []) {
    const fixtureProviderId = row.fixture?.provider_id;
    if (fixtureProviderId == null) {
      continue;
    }

    const playerExternalId = row.player?.provider_id ?? null;
    const assistPlayerExternalId = row.assist_player?.provider_id ?? null;

    if (
      playerExternalId !== playerProviderId &&
      assistPlayerExternalId !== playerProviderId
    ) {
      continue;
    }

    const event: FixtureEvent = {
      externalEventId: row.provider_event_id,
      minute: row.minute ?? 0,
      extraMinute: row.extra_minute,
      teamExternalId: row.team?.provider_id ?? null,
      playerExternalId,
      assistPlayerExternalId,
      type: row.type,
      detail: row.detail,
      comments: row.comments,
    };

    const existing = grouped.get(fixtureProviderId) ?? [];
    existing.push(event);
    grouped.set(fixtureProviderId, existing);
  }

  void playerUuid;
  return grouped;
}

export async function readPlayerCareerFromDb(
  providerId: number
): Promise<PlayerCareerEntry[]> {
  const playerId = await readPlayerIdByProviderIdFromDb(providerId);

  if (!playerId) {
    return [];
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("player_team_history")
    .select(
      `
      joined_on,
      left_on,
      team:teams!player_team_history_team_id_fkey (
        provider_id,
        name,
        code,
        logo_url,
        is_national
      )
    `
    )
    .eq("player_id", playerId)
    .order("joined_on", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(
      `Failed to read player career ${providerId}: ${error.message}`
    );
  }

  return (data ?? []).flatMap((row) => {
    const teamRow = Array.isArray(row.team) ? row.team[0] : row.team;
    if (!teamRow) {
      return [];
    }

    return [
      {
        team: mapTeamRefFromRow(teamRow),
        fromDate: row.joined_on,
        toDate: row.left_on,
        transferType: null,
        entryType: "inferred" as const,
      },
    ];
  });
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

async function getFixtureUuidForRead(
  providerId: number
): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("fixtures")
    .select("id")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve fixture ${providerId}: ${error.message}`
    );
  }

  return data?.id ?? null;
}

type FixtureEventRow = {
  provider_event_id: string | null;
  minute: number;
  extra_minute: number | null;
  type: string;
  detail: string | null;
  comments: string | null;
  team: { provider_id: number } | null;
  player: { provider_id: number } | null;
  assist: { provider_id: number } | null;
};

function mapFixtureEventRow(row: FixtureEventRow): FixtureEvent {
  return {
    externalEventId: row.provider_event_id,
    minute: row.minute,
    extraMinute: row.extra_minute,
    teamExternalId: row.team?.provider_id ?? null,
    playerExternalId: row.player?.provider_id ?? null,
    assistPlayerExternalId: row.assist?.provider_id ?? null,
    type: row.type,
    detail: row.detail,
    comments: row.comments,
  };
}

export async function readFixtureEventsFromDb(
  providerId: number
): Promise<FixtureEvent[]> {
  const fixtureId = await getFixtureUuidForRead(providerId);
  if (!fixtureId) {
    return [];
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("fixture_events")
    .select(
      `
      provider_event_id,
      minute,
      extra_minute,
      type,
      detail,
      comments,
      team:teams!fixture_events_team_id_fkey (provider_id),
      player:players!fixture_events_player_id_fkey (provider_id),
      assist:players!fixture_events_assist_player_id_fkey (provider_id)
    `
    )
    .eq("fixture_id", fixtureId)
    .order("minute", { ascending: true })
    .order("extra_minute", { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(
      `Failed to read fixture events ${providerId}: ${error.message}`
    );
  }

  return ((data ?? []) as FixtureEventRow[]).map(mapFixtureEventRow);
}

type FixtureStatisticsRow = {
  shots_total: number | null;
  shots_on_target: number | null;
  shots_off_target: number | null;
  shots_blocked: number | null;
  shots_inside_box: number | null;
  shots_outside_box: number | null;
  fouls: number | null;
  corners: number | null;
  offsides: number | null;
  ball_possession: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  goalkeeper_saves: number | null;
  total_passes: number | null;
  passes_accurate: number | null;
  passes_percent: number | null;
  expected_goals: number | null;
  team: { provider_id: number } | null;
};

function mapFixtureStatisticsRow(
  row: FixtureStatisticsRow
): FixtureTeamStatistics {
  return {
    teamExternalId: row.team?.provider_id ?? 0,
    shotsTotal: row.shots_total,
    shotsOnTarget: row.shots_on_target,
    shotsOffTarget: row.shots_off_target,
    shotsBlocked: row.shots_blocked,
    shotsInsideBox: row.shots_inside_box,
    shotsOutsideBox: row.shots_outside_box,
    fouls: row.fouls,
    corners: row.corners,
    offsides: row.offsides,
    ballPossession: row.ball_possession,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards,
    goalkeeperSaves: row.goalkeeper_saves,
    totalPasses: row.total_passes,
    passesAccurate: row.passes_accurate,
    passesPercent: row.passes_percent,
    expectedGoals:
      row.expected_goals !== null ? Number(row.expected_goals) : null,
  };
}

export async function readFixtureStatisticsFromDb(
  providerId: number
): Promise<FixtureTeamStatistics[]> {
  const fixtureId = await getFixtureUuidForRead(providerId);
  if (!fixtureId) {
    return [];
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("fixture_statistics")
    .select(
      `
      shots_total,
      shots_on_target,
      shots_off_target,
      shots_blocked,
      shots_inside_box,
      shots_outside_box,
      fouls,
      corners,
      offsides,
      ball_possession,
      yellow_cards,
      red_cards,
      goalkeeper_saves,
      total_passes,
      passes_accurate,
      passes_percent,
      expected_goals,
      team:teams!fixture_statistics_team_id_fkey (provider_id)
    `
    )
    .eq("fixture_id", fixtureId);

  if (error) {
    throw new Error(
      `Failed to read fixture statistics ${providerId}: ${error.message}`
    );
  }

  return ((data ?? []) as FixtureStatisticsRow[]).map(mapFixtureStatisticsRow);
}

type LineupPlayerRow = {
  shirt_number: number | null;
  position: string | null;
  grid: string | null;
  is_starting: boolean;
  is_captain: boolean;
  provider_payload: Record<string, unknown> | null;
  player: { provider_id: number; full_name: string } | null;
};

type LineupRow = {
  formation: string | null;
  coach_name: string | null;
  is_confirmed: boolean;
  team: { provider_id: number } | null;
  lineup_players: LineupPlayerRow[];
};

function mapLineupPlayerRow(row: LineupPlayerRow): LineupPlayer {
  const payloadName =
    typeof row.provider_payload?.name === "string"
      ? row.provider_payload.name
      : null;

  return {
    playerExternalId: row.player?.provider_id ?? null,
    name: row.player?.full_name ?? payloadName ?? "Unknown",
    shirtNumber: row.shirt_number,
    position: row.position,
    grid: row.grid,
    isStarting: row.is_starting,
    isCaptain: row.is_captain,
  };
}

function mapLineupRow(row: LineupRow): Lineup {
  return {
    teamExternalId: row.team?.provider_id ?? 0,
    formation: row.formation,
    coachName: row.coach_name,
    isConfirmed: row.is_confirmed,
    players: (row.lineup_players ?? []).map(mapLineupPlayerRow),
  };
}

export async function readLineupsFromDb(providerId: number): Promise<Lineup[]> {
  const fixtureId = await getFixtureUuidForRead(providerId);
  if (!fixtureId) {
    return [];
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("lineups")
    .select(
      `
      formation,
      coach_name,
      is_confirmed,
      team:teams!lineups_team_id_fkey (provider_id),
      lineup_players (
        shirt_number,
        position,
        grid,
        is_starting,
        is_captain,
        provider_payload,
        player:players (provider_id, full_name)
      )
    `
    )
    .eq("fixture_id", fixtureId);

  if (error) {
    throw new Error(`Failed to read lineups ${providerId}: ${error.message}`);
  }

  return ((data ?? []) as LineupRow[]).map(mapLineupRow);
}
