import { findNowAnchorFixtureId } from "@/lib/fixtures/grouping";
import type { FixturesDayGroup } from "@/lib/fixtures/grouping";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { Fixture } from "@/types/domain";

export type FavoritesAnchor = {
  fixtureId: number | null;
  dayDateKey: string | null;
};

export function findFavoritesAnchor(
  fixtures: Fixture[],
  dayGroups: FixturesDayGroup[],
  todayDateKey: string
): FavoritesAnchor {
  const liveFixtureId = findNowAnchorFixtureId(
    fixtures.filter((fixture) => isLiveFixtureStatus(fixture.status))
  );

  if (liveFixtureId != null) {
    return { fixtureId: liveFixtureId, dayDateKey: null };
  }

  const todayGroup = dayGroups.find((group) => group.dateKey === todayDateKey);
  if (todayGroup != null) {
    return { fixtureId: null, dayDateKey: todayDateKey };
  }

  const nextDay = dayGroups.find((group) => group.dateKey > todayDateKey);
  if (nextDay != null) {
    return { fixtureId: null, dayDateKey: nextDay.dateKey };
  }

  const previousDay = [...dayGroups]
    .reverse()
    .find((group) => group.dateKey < todayDateKey);

  return {
    fixtureId: null,
    dayDateKey: previousDay?.dateKey ?? todayDateKey,
  };
}
