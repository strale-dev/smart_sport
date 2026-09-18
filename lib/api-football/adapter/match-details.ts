import {
  buildExternalEventId,
  parseNullableFloat,
  parseNullableInt,
  parsePercent,
} from "@/lib/api-football/adapter/utils";
import type {
  RawApiFootballEvent,
  RawApiFootballFixturePlayer,
  RawApiFootballLineup,
  RawApiFootballStatisticItem,
  RawApiFootballTeamStatistics,
} from "@/lib/api-football/types";
import type {
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  Lineup,
  LineupPlayer,
} from "@/types/domain";

function getStatisticValue(
  statistics: RawApiFootballStatisticItem[],
  type: string
): number | string | null {
  const item = statistics.find((stat) => stat.type === type);
  return item?.value ?? null;
}

export function mapFixtureEvent(
  raw: RawApiFootballEvent,
  fixtureExternalId: number
): FixtureEvent {
  return {
    externalEventId: buildExternalEventId(
      fixtureExternalId,
      raw.time.elapsed,
      raw.time.extra,
      raw.type,
      raw.team.id,
      raw.player.id
    ),
    minute: raw.time.elapsed,
    extraMinute: raw.time.extra,
    teamExternalId: raw.team.id,
    playerExternalId: raw.player.id,
    assistPlayerExternalId: raw.assist.id,
    playerName: raw.player.name ?? null,
    assistPlayerName: raw.assist.name ?? null,
    type: raw.type,
    detail: raw.detail ?? null,
    comments: raw.comments,
  };
}

export function mapFixtureStatistics(
  raw: RawApiFootballTeamStatistics
): FixtureTeamStatistics {
  const stats = raw.statistics;

  return {
    teamExternalId: raw.team.id,
    shotsTotal: parseNullableInt(getStatisticValue(stats, "Total Shots")),
    shotsOnTarget: parseNullableInt(getStatisticValue(stats, "Shots on Goal")),
    shotsOffTarget: parseNullableInt(
      getStatisticValue(stats, "Shots off Goal")
    ),
    shotsBlocked: parseNullableInt(getStatisticValue(stats, "Blocked Shots")),
    shotsInsideBox: parseNullableInt(
      getStatisticValue(stats, "Shots insidebox")
    ),
    shotsOutsideBox: parseNullableInt(
      getStatisticValue(stats, "Shots outsidebox")
    ),
    fouls: parseNullableInt(getStatisticValue(stats, "Fouls")),
    corners: parseNullableInt(getStatisticValue(stats, "Corner Kicks")),
    offsides: parseNullableInt(getStatisticValue(stats, "Offsides")),
    ballPossession: parsePercent(getStatisticValue(stats, "Ball Possession")),
    yellowCards: parseNullableInt(getStatisticValue(stats, "Yellow Cards")),
    redCards: parseNullableInt(getStatisticValue(stats, "Red Cards")),
    goalkeeperSaves: parseNullableInt(
      getStatisticValue(stats, "Goalkeeper Saves")
    ),
    totalPasses: parseNullableInt(getStatisticValue(stats, "Total passes")),
    passesAccurate: parseNullableInt(
      getStatisticValue(stats, "Passes accurate")
    ),
    passesPercent: parsePercent(getStatisticValue(stats, "Passes %")),
    expectedGoals: parseNullableFloat(
      getStatisticValue(stats, "expected_goals")
    ),
  };
}

function mapLineupPlayer(
  raw: RawApiFootballLineup["startXI"][number],
  isStarting: boolean
): LineupPlayer {
  return {
    playerExternalId: raw.player.id,
    name: raw.player.name,
    shirtNumber: raw.player.number,
    position: raw.player.pos,
    grid: raw.player.grid,
    isStarting,
    isCaptain: false,
  };
}

export function mapLineup(raw: RawApiFootballLineup): Lineup {
  const players = [
    ...raw.startXI.map((entry) => mapLineupPlayer(entry, true)),
    ...raw.substitutes.map((entry) => mapLineupPlayer(entry, false)),
  ];

  return {
    teamExternalId: raw.team.id,
    formation: raw.formation,
    coachName: raw.coach.name,
    coachExternalId: raw.coach.id,
    coachPhotoUrl: raw.coach.photo,
    isConfirmed: players.length > 0,
    players,
  };
}

export function mapFixturePlayerPerformance(
  raw: RawApiFootballFixturePlayer
): FixturePlayerPerformance[] {
  return raw.players.flatMap((entry) =>
    entry.statistics.map((stat) => ({
      teamExternalId: raw.team.id,
      playerExternalId: entry.player.id,
      name: entry.player.name,
      shirtNumber: stat.games.number,
      position: stat.games.position,
      minutes: stat.games.minutes,
      rating: parseNullableFloat(stat.games.rating),
      goals: stat.goals.total,
      assists: stat.goals.assists,
      yellowCards: stat.cards.yellow,
      redCards: stat.cards.red,
      saves: stat.goals.saves,
      shotsTotal: stat.shots.total,
      shotsOnTarget: stat.shots.on,
      passes: stat.passes.total,
      keyPasses: stat.passes.key,
      wasStarter: !stat.games.substitute,
      wasCaptain: stat.games.captain,
    }))
  );
}
