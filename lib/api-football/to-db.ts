import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  League,
  Lineup,
  Player,
  Season,
  StandingRow,
  Team,
} from "@/types/domain";
import type {
  FixtureEventInsert,
  FixtureInsert,
  FixtureStatisticsInsert,
  LeagueInsert,
  LineupInsert,
  PlayerInsert,
  SeasonInsert,
  StandingInsert,
  TeamInsert,
} from "@/types/domain-db";

export function fixtureToInsert(
  fixture: Fixture,
  rawPayload: unknown = null
): FixtureInsert {
  return {
    provider_id: fixture.externalId,
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
    provider_payload: rawPayload as FixtureInsert["provider_payload"],
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
    is_confirmed: lineup.isConfirmed,
    provider_payload: rawPayload as LineupInsert["provider_payload"],
  };
}

export function standingRowToInsert(
  row: StandingRow,
  rawPayload: unknown = null
): StandingInsert {
  return {
    rank: row.rank,
    points: row.points,
    goals_diff: row.goalsDiff,
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
