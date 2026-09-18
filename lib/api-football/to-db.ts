import type {
  CountryRef,
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  League,
  Lineup,
  LineupPlayer,
  Player,
  Season,
  StandingRow,
  Team,
  TeamRef,
  VenueRef,
} from "@/types/domain";
import type {
  CountryInsert,
  FixtureInsert,
  FixtureEventInsert,
  FixtureStatisticsInsert,
  LeagueInsert,
  LineupInsert,
  LineupPlayerInsert,
  PlayerInsert,
  SeasonInsert,
  StandingInsert,
  TeamInsert,
  VenueInsert,
} from "@/types/domain-db";

export function fixtureToInsert(
  fixture: Fixture,
  relations: {
    leagueId: string;
    seasonId: string | null;
    homeTeamId: string;
    awayTeamId: string;
    venueId: string | null;
  },
  rawPayload: unknown = null,
  syncedAt = new Date().toISOString()
): FixtureInsert {
  return {
    provider_id: fixture.externalId,
    league_id: relations.leagueId,
    season_id: relations.seasonId,
    home_team_id: relations.homeTeamId,
    away_team_id: relations.awayTeamId,
    venue_id: relations.venueId,
    round: fixture.round,
    referee: fixture.referee,
    kickoff_at: fixture.kickoffAt,
    status: fixture.status,
    minute: fixture.minute,
    score_home: fixture.score.home,
    score_away: fixture.score.away,
    ht_home: fixture.score.halftimeHome,
    ht_away: fixture.score.halftimeAway,
    ft_home: fixture.score.fulltimeHome,
    ft_away: fixture.score.fulltimeAway,
    et_home: fixture.score.extratimeHome,
    et_away: fixture.score.extratimeAway,
    pen_home: fixture.score.penaltyHome,
    pen_away: fixture.score.penaltyAway,
    status_extra_minute: fixture.liveClock?.statusExtraMinute ?? null,
    period_first_start_at: fixture.liveClock?.periodFirstStartAt ?? null,
    period_second_start_at: fixture.liveClock?.periodSecondStartAt ?? null,
    last_provider_sync_at: syncedAt,
    provider_payload: rawPayload as FixtureInsert["provider_payload"],
  };
}

export function countryRefToInsert(country: CountryRef): CountryInsert {
  return {
    provider_id: country.code ?? country.name,
    code: country.code,
    name: country.name,
    flag_url: country.flagUrl,
  };
}

export function venueRefToInsert(venue: VenueRef): VenueInsert {
  return {
    provider_id: venue.externalId,
    name: venue.name,
    city: venue.city,
    capacity: venue.capacity,
    surface: venue.surface,
    image_url: venue.imageUrl,
  };
}

export function teamRefToInsert(
  team: TeamRef
): Omit<TeamInsert, "provider_payload"> {
  return {
    provider_id: team.externalId,
    name: team.name,
    code: team.code,
    founded: null,
    is_national: team.isNational,
    logo_url: team.logoUrl,
  };
}

export function teamToInsert(
  team: Team,
  rawPayload: unknown = null
): TeamInsert {
  return {
    provider_id: team.externalId,
    name: team.name,
    code: team.code,
    founded: team.founded,
    is_national: team.isNational,
    logo_url: team.logoUrl,
    provider_payload: rawPayload as TeamInsert["provider_payload"],
  };
}

export function playerToInsert(
  player: Player,
  rawPayload: unknown = null
): PlayerInsert {
  return {
    provider_id: player.externalId,
    first_name: player.firstName,
    last_name: player.lastName,
    full_name: player.fullName,
    nationality: player.nationality,
    date_of_birth: player.dateOfBirth,
    height_cm: player.heightCm,
    weight_kg: player.weightKg,
    position: player.position,
    preferred_foot: player.preferredFoot,
    photo_url: player.photoUrl,
    provider_payload: rawPayload as PlayerInsert["provider_payload"],
  };
}

export function leagueToInsert(
  league: League,
  rawPayload: unknown = null
): LeagueInsert {
  return {
    provider_id: league.externalId,
    name: league.name,
    type: league.type,
    country_name: league.country?.name ?? null,
    logo_url: league.logoUrl,
    is_active: league.isActive,
    provider_payload: rawPayload as LeagueInsert["provider_payload"],
  };
}

export function seasonToInsert(
  season: Season,
  rawPayload: unknown = null
): SeasonInsert {
  return {
    year: season.year,
    start_date: season.startDate,
    end_date: season.endDate,
    is_current: season.isCurrent,
    provider_payload: rawPayload as SeasonInsert["provider_payload"],
  };
}

export function fixtureEventToInsert(
  event: FixtureEvent,
  rawPayload: unknown = null
): FixtureEventInsert {
  return {
    provider_event_id: event.externalEventId,
    minute: event.minute,
    extra_minute: event.extraMinute,
    type: event.type,
    detail: event.detail,
    comments: event.comments,
    provider_payload: rawPayload as FixtureEventInsert["provider_payload"],
  };
}

export function fixtureStatisticsToInsert(
  stats: FixtureTeamStatistics,
  rawPayload: unknown = null
): FixtureStatisticsInsert {
  return {
    shots_total: stats.shotsTotal,
    shots_on_target: stats.shotsOnTarget,
    shots_off_target: stats.shotsOffTarget,
    shots_blocked: stats.shotsBlocked,
    shots_inside_box: stats.shotsInsideBox,
    shots_outside_box: stats.shotsOutsideBox,
    fouls: stats.fouls,
    corners: stats.corners,
    offsides: stats.offsides,
    ball_possession: stats.ballPossession,
    yellow_cards: stats.yellowCards,
    red_cards: stats.redCards,
    goalkeeper_saves: stats.goalkeeperSaves,
    total_passes: stats.totalPasses,
    passes_accurate: stats.passesAccurate,
    passes_percent: stats.passesPercent,
    expected_goals: stats.expectedGoals,
    provider_payload: rawPayload as FixtureStatisticsInsert["provider_payload"],
  };
}

export function lineupToInsert(
  lineup: Lineup,
  rawPayload: unknown = null
): LineupInsert {
  return {
    formation: lineup.formation,
    coach_name: lineup.coachName,
    coach_provider_id: lineup.coachExternalId ?? null,
    coach_photo_url: lineup.coachPhotoUrl ?? null,
    is_confirmed: lineup.isConfirmed,
    provider_payload: rawPayload as LineupInsert["provider_payload"],
  };
}

export function lineupPlayerToInsert(
  player: LineupPlayer,
  rawPayload: unknown = null
): LineupPlayerInsert {
  return {
    shirt_number: player.shirtNumber,
    position: player.position,
    grid: player.grid,
    is_starting: player.isStarting,
    is_captain: player.isCaptain,
    provider_payload: rawPayload as LineupPlayerInsert["provider_payload"],
  };
}

export function standingRowToInsert(
  row: StandingRow,
  relations: {
    leagueId: string;
    seasonId: string;
    teamId: string;
  },
  rawPayload: unknown = null
): StandingInsert {
  return {
    league_id: relations.leagueId,
    season_id: relations.seasonId,
    team_id: relations.teamId,
    rank: row.rank,
    points: row.points,
    goal_diff: row.goalsDiff,
    group_name: row.groupName,
    form: row.form,
    played: row.played,
    win: row.win,
    draw: row.draw,
    lose: row.lose,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    provider_payload: rawPayload as StandingInsert["provider_payload"],
  };
}

export function fixturePlayerPerformanceToPayload(
  performances: FixturePlayerPerformance[]
): unknown {
  return performances;
}
