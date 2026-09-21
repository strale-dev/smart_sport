import { finalizeExpiredStaleLiveFixturesInDb } from "@/lib/live/finalize-expired-stale-live";
import { resolvePresentationFixtures } from "@/lib/live/live-presentation";
import {
  buildUpcomingAndPastDayGroups,
  collectActiveLeagueIds,
  collectLiveLeagueIds,
  collectUpcomingFixturesFromDayGroups,
  findNowAnchorFixtureId,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
import {
  FIXTURES_PAST_DAYS,
  FIXTURES_WINDOW_DAYS,
} from "@/lib/fixtures/constants";
import { buildTimezoneWindow } from "@/lib/datetime/timezone";
import {
  parseFixturesParams,
  type FixturesSearchParams,
} from "@/lib/fixtures/url";
import { getMatchesInRange } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

export type FixturesData = {
  upcomingDayGroups: FixturesDayGroup[];
  pastDayGroups: FixturesDayGroup[];
  /** Primary upcoming groups (alias for anchors / legacy callers). */
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

function normalizeFilterToken(value: string): string {
  return value.trim().toLowerCase();
}

function filterFixturesBySearchParams(
  fixtures: Fixture[],
  params: FixturesSearchParams
): Fixture[] {
  let result = filterByLeague(fixtures, params.league);

  if (params.country) {
    const countryNeedle = normalizeFilterToken(params.country);
    result = result.filter((fixture) => {
      const country = fixture.league.country;
      if (!country) {
        return false;
      }
      return (
        normalizeFilterToken(country.name) === countryNeedle ||
        (country.code != null &&
          normalizeFilterToken(country.code) === countryNeedle)
      );
    });
  }

  if (params.q) {
    const query = normalizeFilterToken(params.q);
    result = result.filter((fixture) => {
      const leagueName = fixture.league.name.toLowerCase();
      const countryName = fixture.league.country?.name.toLowerCase() ?? "";
      return leagueName.includes(query) || countryName.includes(query);
    });
  }

  return result;
}

export { parseFixturesParams };

export async function getFixturesData(
  params: FixturesSearchParams = {},
  timeZone: string,
  now = new Date()
): Promise<FixturesData> {
  await finalizeExpiredStaleLiveFixturesInDb(now);

  const { fromUtc, toUtcExclusive, todayDateKey } = buildTimezoneWindow(
    now,
    timeZone,
    FIXTURES_PAST_DAYS,
    FIXTURES_WINDOW_DAYS
  );
  const result = await getMatchesInRange(fromUtc, toUtcExclusive);
  const nowMs = now.getTime();
  const allFixtures = resolvePresentationFixtures(result.data, nowMs);
  const filtered = filterFixturesBySearchParams(allFixtures, params);

  const { upcomingDayGroups, pastDayGroups } = buildUpcomingAndPastDayGroups(
    filtered,
    now,
    timeZone,
    todayDateKey,
    params.league
  );

  const upcomingFixtures =
    collectUpcomingFixturesFromDayGroups(upcomingDayGroups);

  return {
    upcomingDayGroups,
    pastDayGroups,
    dayGroups: upcomingDayGroups,
    liveLeagueIds: collectLiveLeagueIds(allFixtures),
    activeLeagueIds: collectActiveLeagueIds(allFixtures),
    nowAnchorFixtureId: findNowAnchorFixtureId(upcomingFixtures),
    todayDateKey,
    filters: { league: params.league },
    isEmpty: upcomingDayGroups.length === 0 && pastDayGroups.length === 0,
  };
}
