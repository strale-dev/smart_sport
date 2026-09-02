import { findFavoritesAnchor } from "@/lib/favorites/anchor";
import {
  FAVORITES_FUTURE_DAYS,
  FAVORITES_PAST_DAYS,
} from "@/lib/favorites/constants";
import { buildTimezoneWindow } from "@/lib/datetime/timezone";
import {
  groupFixturesByDayAndLeagueInTimezone,
  type FixturesDayGroup,
} from "@/lib/fixtures/grouping";
import {
  readFixturesForTeamsInRangeFromDb,
  readFollowedTeamsForUser,
} from "@/lib/ingestion/db-read";
import { readProfileTimezone } from "@/lib/supabase/profile";

export type FavoritesEmptyReason = "no_follows" | "no_matches";

export type FavoritesData = {
  dayGroups: FixturesDayGroup[];
  nowAnchorFixtureId: number | null;
  todayDateKey: string;
  followedTeamIds: string[];
  followedTeamProviderIds: number[];
  isEmpty: boolean;
  emptyReason: FavoritesEmptyReason | null;
};

export async function getFavoritesData(
  userId: string,
  now = new Date()
): Promise<FavoritesData> {
  const [timeZone, followedTeams] = await Promise.all([
    readProfileTimezone(userId),
    readFollowedTeamsForUser(userId),
  ]);

  const followedTeamIds = followedTeams.map((team) => team.id);
  const followedTeamProviderIds = followedTeams.map((team) => team.providerId);

  if (followedTeamIds.length === 0) {
    return {
      dayGroups: [],
      nowAnchorFixtureId: null,
      todayDateKey: buildTimezoneWindow(
        now,
        timeZone,
        FAVORITES_PAST_DAYS,
        FAVORITES_FUTURE_DAYS
      ).todayDateKey,
      followedTeamIds: [],
      followedTeamProviderIds: [],
      isEmpty: true,
      emptyReason: "no_follows",
    };
  }

  const { fromUtc, toUtcExclusive, todayDateKey } = buildTimezoneWindow(
    now,
    timeZone,
    FAVORITES_PAST_DAYS,
    FAVORITES_FUTURE_DAYS
  );

  const fixtures = await readFixturesForTeamsInRangeFromDb(
    followedTeamIds,
    fromUtc,
    toUtcExclusive
  );

  if (fixtures.length === 0) {
    return {
      dayGroups: [],
      nowAnchorFixtureId: null,
      todayDateKey,
      followedTeamIds,
      followedTeamProviderIds,
      isEmpty: true,
      emptyReason: "no_matches",
    };
  }

  const dayGroups = groupFixturesByDayAndLeagueInTimezone(
    fixtures,
    now,
    timeZone
  );
  const anchor = findFavoritesAnchor(fixtures, dayGroups, todayDateKey);

  return {
    dayGroups,
    nowAnchorFixtureId: anchor.fixtureId,
    todayDateKey: anchor.dayDateKey ?? todayDateKey,
    followedTeamIds,
    followedTeamProviderIds,
    isEmpty: false,
    emptyReason: null,
  };
}
