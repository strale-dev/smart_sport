import {
  collectActiveLeagueIds,
  collectLiveLeagueIds,
  findNowAnchorFixtureId,
  groupFixturesByDayAndLeagueInTimezone,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
import { FIXTURES_WINDOW_DAYS } from "@/lib/fixtures/constants";
import { buildTimezoneWindow } from "@/lib/datetime/timezone";
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
  timeZone: string,
  now = new Date()
): Promise<FixturesData> {
  const { fromUtc, toUtcExclusive, todayDateKey } = buildTimezoneWindow(
    now,
    timeZone,
    0,
    FIXTURES_WINDOW_DAYS
  );
  const result = await getMatchesInRange(fromUtc, toUtcExclusive);
  const allFixtures = result.data;
  const filtered = filterByLeague(allFixtures, params.league);

  return {
    dayGroups: groupFixturesByDayAndLeagueInTimezone(
      filtered,
      now,
      timeZone,
      params.league
    ),
    liveLeagueIds: collectLiveLeagueIds(allFixtures),
    activeLeagueIds: collectActiveLeagueIds(allFixtures),
    nowAnchorFixtureId: findNowAnchorFixtureId(filtered),
    todayDateKey,
    filters: { league: params.league },
    isEmpty: filtered.length === 0,
  };
}
