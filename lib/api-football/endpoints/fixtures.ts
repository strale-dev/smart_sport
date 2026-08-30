import {
  mapFixture,
  mapFixtureEvent,
  mapFixturePlayerPerformance,
  mapFixtureStatistics,
  mapLineup,
} from "@/lib/api-football/adapter";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type {
  RawApiFootballEvent,
  RawApiFootballFixture,
  RawApiFootballFixturePlayer,
  RawApiFootballLineup,
  RawApiFootballTeamStatistics,
} from "@/lib/api-football/types";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureTeamStatistics,
  Lineup,
} from "@/types/domain";

export async function getFixtureById(id: number): Promise<Fixture | null> {
  const response = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { id }
  );
  const raw = response[0];
  return raw ? mapFixture(raw) : null;
}

export async function listFixturesByDate(date: string): Promise<Fixture[]> {
  const response = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { date }
  );
  return response.map(mapFixture);
}

export async function listLiveFixtures(): Promise<Fixture[]> {
  const response = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { live: "all" },
    { priority: "critical" }
  );
  return response.map(mapFixture);
}

export async function getFixtureEvents(
  fixtureId: number
): Promise<FixtureEvent[]> {
  const response = await apiFootballFetchResponse<RawApiFootballEvent>(
    "/fixtures/events",
    { fixture: fixtureId }
  );
  return response.map((event) => mapFixtureEvent(event, fixtureId));
}

export async function getFixtureStatistics(
  fixtureId: number
): Promise<FixtureTeamStatistics[]> {
  const response = await apiFootballFetchResponse<RawApiFootballTeamStatistics>(
    "/fixtures/statistics",
    { fixture: fixtureId }
  );
  return response.map(mapFixtureStatistics);
}

export async function getFixtureLineups(fixtureId: number): Promise<Lineup[]> {
  const response = await apiFootballFetchResponse<RawApiFootballLineup>(
    "/fixtures/lineups",
    { fixture: fixtureId }
  );
  return response.map(mapLineup);
}

export async function getFixturePlayers(
  fixtureId: number
): Promise<FixturePlayerPerformance[]> {
  const response = await apiFootballFetchResponse<RawApiFootballFixturePlayer>(
    "/fixtures/players",
    { fixture: fixtureId }
  );
  return response.flatMap(mapFixturePlayerPerformance);
}

export async function getFixtureByIdWithRaw(id: number) {
  const response = await apiFootballFetchResponse<RawApiFootballFixture>(
    "/fixtures",
    { id }
  );
  const raw = response[0];
  return raw ? { raw, domain: mapFixture(raw) } : null;
}
