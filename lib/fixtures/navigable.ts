import { isLeagueInAllowlist } from "@/lib/ingestion/config";
import type { Fixture } from "@/types/domain";

export function isAllowlistedFixture(fixture: Fixture): boolean {
  return isLeagueInAllowlist(fixture.league.externalId);
}

export function filterAllowlistedFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter(isAllowlistedFixture);
}
