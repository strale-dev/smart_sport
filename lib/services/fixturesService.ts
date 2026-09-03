import {
  collectActiveLeagueIds,
  collectLiveLeagueIds,
  findNowAnchorFixtureId,
  groupFixturesByDayAndLeague,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
import { buildFixturesWindow, utcDateString } from "@/lib/fixtures/window";
import {
  parseFixturesParams,
  type FixturesSearchParams,
} from "@/lib/fixtures/url";
import { getMatchesInRange } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

export type FixturesData = {
  dayGroups: FixturesDayGroup[];
  liveLeagueIds: number[];
  activeLeagueIds: number[];
  nowAnchorFixtureId: number | null;
  todayDateKey: string;
  filters: FixturesSearchParams;
  isEmpty: boolean;
};

function filterByLeague(fixtures: Fixture[], league?: number): Fixture[] {
  if (league == null) {
    return fixtures;
  }

  return fixtures.filter((fixture) => fixture.league.externalId === league);
}

export { parseFixturesParams };

export async function getFixturesData(
  params: FixturesSearchParams = {},
  now = new Date()
): Promise<FixturesData> {
  const { fromDate, toDateExclusive } = buildFixturesWindow(now);
  const result = await getMatchesInRange(fromDate, toDateExclusive);
  const allFixtures = result.data;
  const filtered = filterByLeague(allFixtures, params.league);

  return {
    dayGroups: groupFixturesByDayAndLeague(filtered, params.league, now),
    liveLeagueIds: collectLiveLeagueIds(allFixtures),
    activeLeagueIds: collectActiveLeagueIds(allFixtures),
    nowAnchorFixtureId: findNowAnchorFixtureId(filtered),
    todayDateKey: utcDateString(now),
    filters: { league: params.league },
    isEmpty: filtered.length === 0,
  };
}
