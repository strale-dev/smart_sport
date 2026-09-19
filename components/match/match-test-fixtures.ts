import { aggregateForm } from "@/lib/analytics/compute-form";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
  FixtureStatus,
} from "@/types/domain";

const emptyCountry = {
  externalId: null,
  code: null,
  name: "England",
  flagUrl: null,
};

export function makeMatchTestFixture(
  status: FixtureStatus,
  overrides: Partial<Fixture> = {}
): Fixture {
  return {
    externalId: 1001,
    league: {
      externalId: 39,
      name: "League",
      type: null,
      country: emptyCountry,
      logoUrl: null,
    },
    seasonYear: 2025,
    homeTeam: {
      externalId: 10,
      name: "Home FC",
      code: "HOM",
      logoUrl: null,
      isNational: false,
    },
    awayTeam: {
      externalId: 20,
      name: "Away FC",
      code: "AWY",
      logoUrl: null,
      isNational: false,
    },
    kickoffAt: "2026-01-01T15:00:00Z",
    status,
    minute: status === "FT" ? 90 : 55,
    score: {
      home: 1,
      away: 0,
      halftimeHome: 1,
      halftimeAway: 0,
      fulltimeHome: 1,
      fulltimeAway: 0,
      extratimeHome: null,
      extratimeAway: null,
      penaltyHome: null,
      penaltyAway: null,
    },
    venue: null,
    referee: null,
    round: null,
    ...overrides,
  };
}

export function makeTeamStats(teamExternalId: number): FixtureTeamStatistics {
  return {
    teamExternalId,
    shotsTotal: 5,
    shotsOnTarget: 2,
    shotsOffTarget: null,
    shotsBlocked: null,
    shotsInsideBox: null,
    shotsOutsideBox: null,
    fouls: null,
    corners: null,
    offsides: null,
    ballPossession: 52,
    yellowCards: null,
    redCards: null,
    goalkeeperSaves: null,
    totalPasses: null,
    passesAccurate: null,
    passesPercent: null,
    expectedGoals: null,
    distanceCovered: null,
    bigChances: null,
    freeKicks: null,
  };
}

export function makeGoalEvent(
  teamExternalId: number,
  minute = 12
): FixtureEvent {
  return {
    externalEventId: `ev-${minute}`,
    minute,
    extraMinute: null,
    teamExternalId,
    playerExternalId: 99,
    assistPlayerExternalId: null,
    type: "Goal",
    detail: "Normal Goal",
    comments: null,
  };
}

export const emptyForm = aggregateForm([], "ALL", 10);

export const emptyPlayersToWatch: PlayersToWatchResult = {
  phase: "LIVE",
  source: "actual",
  players: [],
};
