import { FIXTURES_WINDOW_DAYS } from "@/lib/fixtures/constants";
import {
  formatDateKeyInTimezone,
  formatDayLabelInTimezone,
} from "@/lib/datetime/timezone";
import {
  LIVE_LEAGUE_MORE,
  LIVE_LEAGUE_TABS,
  findLiveLeagueTab,
} from "@/lib/live/constants";
import {
  isLiveFixtureStatus,
  providerFixturesRangeKey,
} from "@/lib/redis/keys";
import { addUtcDays, utcDateString } from "@/lib/fixtures/window";
import type { Fixture } from "@/types/domain";

export type FixturesLeagueGroup = {
  providerId: number;
  label: string;
  logoUrl: string | null;
  fixtures: Fixture[];
};

export type FixturesDayGroup = {
  dateKey: string;
  label: string;
  leagues?: FixturesLeagueGroup[];
  fixtures?: Fixture[];
};

const PRESTIGE_LEAGUE_ORDER = [...LIVE_LEAGUE_TABS, ...LIVE_LEAGUE_MORE].map(
  (tab) => tab.providerId
);

export function buildFixturesRangeCacheKey(now = new Date()): string {
  const fromDate = utcDateString(now);
  const toDateExclusive = addUtcDays(fromDate, FIXTURES_WINDOW_DAYS + 1);
  return providerFixturesRangeKey(fromDate, toDateExclusive);
}

export function formatDayLabel(dateKey: string, now: Date): string {
  const today = utcDateString(now);
  const tomorrow = addUtcDays(today, 1);

  if (dateKey === today) {
    return "Today";
  }

  if (dateKey === tomorrow) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function leagueSortIndex(providerId: number): number {
  const index = PRESTIGE_LEAGUE_ORDER.indexOf(providerId);
  return index >= 0 ? index : PRESTIGE_LEAGUE_ORDER.length;
}

function groupFixturesByLeague(fixtures: Fixture[]): FixturesLeagueGroup[] {
  const byLeague = new Map<number, Fixture[]>();

  for (const fixture of fixtures) {
    const leagueId = fixture.league.externalId;
    const list = byLeague.get(leagueId) ?? [];
    list.push(fixture);
    byLeague.set(leagueId, list);
  }

  return Array.from(byLeague.entries())
    .sort(([leftId], [rightId]) => {
      const leftIndex = leagueSortIndex(leftId);
      const rightIndex = leagueSortIndex(rightId);
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      const leftTab = findLiveLeagueTab(leftId);
      const rightTab = findLiveLeagueTab(rightId);
      return (leftTab?.label ?? String(leftId)).localeCompare(
        rightTab?.label ?? String(rightId)
      );
    })
    .map(([providerId, leagueFixtures]) => {
      const tab = findLiveLeagueTab(providerId);
      return {
        providerId,
        label: tab?.label ?? leagueFixtures[0]?.league.name ?? "Unknown",
        logoUrl: leagueFixtures[0]?.league.logoUrl ?? null,
        fixtures: leagueFixtures,
      };
    });
}

export function collectLiveLeagueIds(fixtures: Fixture[]): number[] {
  const ids = new Set<number>();

  for (const fixture of fixtures) {
    if (isLiveFixtureStatus(fixture.status)) {
      ids.add(fixture.league.externalId);
    }
  }

  return Array.from(ids);
}

export function collectActiveLeagueIds(fixtures: Fixture[]): number[] {
  const ids = new Set<number>();

  for (const fixture of fixtures) {
    ids.add(fixture.league.externalId);
  }

  return Array.from(ids).sort(
    (left, right) => leagueSortIndex(left) - leagueSortIndex(right)
  );
}

export function findNowAnchorFixtureId(fixtures: Fixture[]): number | null {
  const sorted = [...fixtures].sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
  );

  const live = sorted.find((fixture) => isLiveFixtureStatus(fixture.status));
  if (live) {
    return live.externalId;
  }

  const upcoming = sorted.find(
    (fixture) => fixture.status === "NS" || fixture.status === "TBD"
  );
  return upcoming?.externalId ?? null;
}

export function groupFixturesByDayAndLeague(
  fixtures: Fixture[],
  leagueFilter: number | undefined,
  now: Date
): FixturesDayGroup[] {
  const sorted = [...fixtures].sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
  );

  const byDay = new Map<string, Fixture[]>();

  for (const fixture of sorted) {
    const dayKey = fixture.kickoffAt.slice(0, 10);
    const list = byDay.get(dayKey) ?? [];
    list.push(fixture);
    byDay.set(dayKey, list);
  }

  return Array.from(byDay.entries()).map(([dateKey, dayFixtures]) => {
    const label = formatDayLabel(dateKey, now);

    if (leagueFilter != null) {
      return { dateKey, label, fixtures: dayFixtures };
    }

    return {
      dateKey,
      label,
      leagues: groupFixturesByLeague(dayFixtures),
    };
  });
}

export function groupFixturesByDayAndLeagueInTimezone(
  fixtures: Fixture[],
  now: Date,
  timeZone: string,
  leagueFilter?: number
): FixturesDayGroup[] {
  const sorted = [...fixtures].sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime()
  );

  const byDay = new Map<string, Fixture[]>();

  for (const fixture of sorted) {
    const dayKey = formatDateKeyInTimezone(fixture.kickoffAt, timeZone);
    const list = byDay.get(dayKey) ?? [];
    list.push(fixture);
    byDay.set(dayKey, list);
  }

  return Array.from(byDay.entries()).map(([dateKey, dayFixtures]) => {
    const label = formatDayLabelInTimezone(dateKey, now, timeZone);

    if (leagueFilter != null) {
      return { dateKey, label, fixtures: dayFixtures };
    }

    return {
      dateKey,
      label,
      leagues: groupFixturesByLeague(dayFixtures),
    };
  });
}
