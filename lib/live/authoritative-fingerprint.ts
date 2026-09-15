import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

export type AuthoritativeLiveState = {
  fixture: Fixture;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
};

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function fixtureCorePayload(fixture: Fixture): Record<string, unknown> {
  return {
    status: fixture.status,
    minute: fixture.minute,
    score: fixture.score,
    liveClock: fixture.liveClock
      ? {
          statusExtraMinute: fixture.liveClock.statusExtraMinute,
          periodFirstStartAt: fixture.liveClock.periodFirstStartAt,
          periodSecondStartAt: fixture.liveClock.periodSecondStartAt,
        }
      : null,
  };
}

function eventSortKey(event: FixtureEvent): string {
  const id =
    event.externalEventId ??
    `${event.minute}:${event.extraMinute ?? ""}:${event.type}:${event.detail ?? ""}:${event.teamExternalId ?? ""}`;
  return `${String(event.minute).padStart(3, "0")}:${String(event.extraMinute ?? "").padStart(2, "0")}:${id}`;
}

export function normalizeEventsForFingerprint(
  events: FixtureEvent[]
): FixtureEvent[] {
  return [...events].sort((a, b) =>
    eventSortKey(a).localeCompare(eventSortKey(b))
  );
}

function eventPayload(event: FixtureEvent): Record<string, unknown> {
  return {
    externalEventId: event.externalEventId,
    minute: event.minute,
    extraMinute: event.extraMinute,
    teamExternalId: event.teamExternalId,
    playerExternalId: event.playerExternalId,
    assistPlayerExternalId: event.assistPlayerExternalId,
    type: event.type,
    detail: event.detail,
    comments: event.comments,
  };
}

function statisticsPayload(stats: FixtureTeamStatistics[]): unknown[] {
  return [...stats]
    .sort((a, b) => a.teamExternalId - b.teamExternalId)
    .map((stat) => ({
      teamExternalId: stat.teamExternalId,
      shotsTotal: stat.shotsTotal,
      shotsOnTarget: stat.shotsOnTarget,
      expectedGoals: stat.expectedGoals,
      ballPossession: stat.ballPossession,
      corners: stat.corners,
      fouls: stat.fouls,
      yellowCards: stat.yellowCards,
      redCards: stat.redCards,
    }));
}

export function buildFixtureFingerprint(fixture: Fixture): string {
  return stableJson(fixtureCorePayload(fixture));
}

export function buildEventsFingerprint(events: FixtureEvent[]): string {
  return stableJson(
    normalizeEventsForFingerprint(events).map((event) => eventPayload(event))
  );
}

export function buildStatisticsFingerprint(
  statistics: FixtureTeamStatistics[]
): string {
  return stableJson(statisticsPayload(statistics));
}

export function buildAuthoritativeFingerprint(
  state: AuthoritativeLiveState
): string {
  return stableJson({
    fixture: fixtureCorePayload(state.fixture),
    events: normalizeEventsForFingerprint(state.events).map((event) =>
      eventPayload(event)
    ),
    statistics: statisticsPayload(state.statistics),
  });
}

export type AuthoritativeChangeFlags = {
  fixture: boolean;
  events: boolean;
  statistics: boolean;
  any: boolean;
};

export function diffAuthoritativeState(
  previous: AuthoritativeLiveState | null,
  next: AuthoritativeLiveState
): AuthoritativeChangeFlags {
  if (!previous) {
    return {
      fixture: true,
      events: true,
      statistics: true,
      any: true,
    };
  }

  const fixture =
    buildFixtureFingerprint(previous.fixture) !==
    buildFixtureFingerprint(next.fixture);
  const events =
    buildEventsFingerprint(previous.events) !==
    buildEventsFingerprint(next.events);
  const statistics =
    buildStatisticsFingerprint(previous.statistics) !==
    buildStatisticsFingerprint(next.statistics);

  return {
    fixture,
    events,
    statistics,
    any: fixture || events || statistics,
  };
}
