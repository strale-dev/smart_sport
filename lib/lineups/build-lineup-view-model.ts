import type {
  BuildLineupViewModelInput,
  LineupDisplayPlayer,
  LineupFieldViewModel,
  LineupMatchBadges,
  LineupStatusLabel,
  LineupTeamViewModel,
} from "@/lib/lineups/types";
import { getMatchOverviewRenderMode } from "@/lib/fixtures/overview-layout";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  Lineup,
  LineupPlayer,
} from "@/types/domain";

function findLineup(
  lineups: Lineup[],
  teamExternalId: number
): Lineup | undefined {
  return lineups.find((lineup) => lineup.teamExternalId === teamExternalId);
}

function buildPerformanceMap(
  performances: FixturePlayerPerformance[]
): Map<number, FixturePlayerPerformance> {
  const map = new Map<number, FixturePlayerPerformance>();
  for (const row of performances) {
    map.set(row.playerExternalId, row);
  }
  return map;
}

function buildMatchBadgesFromEvents(
  events: FixtureEvent[],
  playerExternalId: number | null
): LineupMatchBadges {
  if (playerExternalId == null) {
    return { goals: 0, assists: 0 };
  }

  let goals = 0;
  let assists = 0;

  for (const event of events) {
    if (event.type !== "Goal") {
      continue;
    }
    if (event.playerExternalId === playerExternalId) {
      goals += 1;
    }
    if (event.assistPlayerExternalId === playerExternalId) {
      assists += 1;
    }
  }

  return { goals, assists };
}

function enrichPlayer(
  player: LineupPlayer,
  performanceMap: Map<number, FixturePlayerPerformance>,
  events: FixtureEvent[]
): LineupDisplayPlayer {
  const perf =
    player.playerExternalId != null
      ? performanceMap.get(player.playerExternalId)
      : undefined;

  const isCaptain = perf?.wasCaptain ?? player.isCaptain;
  const rating =
    perf?.rating != null && (perf.minutes ?? 0) > 0 ? perf.rating : null;

  return {
    ...player,
    photoUrl: player.photoUrl ?? null,
    rating,
    minutes: perf?.minutes ?? null,
    goals: perf?.goals ?? null,
    assists: perf?.assists ?? null,
    isCaptain,
    matchBadges: buildMatchBadgesFromEvents(events, player.playerExternalId),
  };
}

function partitionSidelined(
  sidelined: FixtureSidelinedPlayer[],
  teamExternalId: number
): { injured: FixtureSidelinedPlayer[]; suspended: FixtureSidelinedPlayer[] } {
  const forTeam = sidelined.filter(
    (row) => row.teamExternalId === teamExternalId
  );
  return {
    injured: forTeam.filter((row) => row.kind === "injury"),
    suspended: forTeam.filter((row) => row.kind === "suspension"),
  };
}

function buildTeamViewModel(
  lineup: Lineup | undefined,
  teamName: string,
  teamLogoUrl: string | null,
  performanceMap: Map<number, FixturePlayerPerformance>,
  events: FixtureEvent[],
  sidelined: FixtureSidelinedPlayer[]
): LineupTeamViewModel | null {
  if (!lineup || lineup.players.length === 0) {
    return null;
  }

  const enriched = lineup.players.map((player) =>
    enrichPlayer(player, performanceMap, events)
  );

  const { injured, suspended } = partitionSidelined(
    sidelined,
    lineup.teamExternalId
  );

  return {
    teamExternalId: lineup.teamExternalId,
    teamName,
    teamLogoUrl,
    formation: lineup.formation,
    coachName: lineup.coachName,
    coachPhotoUrl: lineup.coachPhotoUrl ?? null,
    starters: enriched.filter((player) => player.isStarting),
    substitutes: enriched.filter((player) => !player.isStarting),
    injured,
    suspended,
  };
}

function resolveStatusLabel(
  fixture: Fixture,
  lineups: Lineup[]
): LineupStatusLabel {
  const hasStarters = lineups.some((lineup) =>
    lineup.players.some((player) => player.isStarting)
  );
  if (!hasStarters) {
    return "Possible lineups";
  }

  const renderMode = getMatchOverviewRenderMode(fixture.status);
  if (renderMode === "pre") {
    return "Possible lineups";
  }

  return "Lineups";
}

export function buildLineupViewModel(
  input: BuildLineupViewModelInput
): LineupFieldViewModel {
  const { fixture, lineups, performances, events, sidelined } = input;
  const performanceMap = buildPerformanceMap(performances);

  const homeLineup = findLineup(lineups, fixture.homeTeam.externalId);
  const awayLineup = findLineup(lineups, fixture.awayTeam.externalId);

  return {
    statusLabel: resolveStatusLabel(fixture, lineups),
    home: buildTeamViewModel(
      homeLineup,
      fixture.homeTeam.name,
      fixture.homeTeam.logoUrl,
      performanceMap,
      events,
      sidelined
    ),
    away: buildTeamViewModel(
      awayLineup,
      fixture.awayTeam.name,
      fixture.awayTeam.logoUrl,
      performanceMap,
      events,
      sidelined
    ),
  };
}

export function lineupViewModelHasPitchContent(
  model: LineupFieldViewModel
): boolean {
  return model.home != null || model.away != null;
}

export function lineupViewModelHasContent(
  model: LineupFieldViewModel,
  sidelined: FixtureSidelinedPlayer[] = []
): boolean {
  return lineupViewModelHasPitchContent(model) || sidelined.length > 0;
}
