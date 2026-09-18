import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

export type LiveSnapshotSlice = {
  fixture?: Fixture | null;
  events?: FixtureEvent[] | null;
  statistics?: FixtureTeamStatistics[] | null;
};

function preferLiveArray<T>(
  live: T[] | null | undefined,
  initial: T[] | null | undefined
): T[] {
  if (live && live.length > 0) {
    return live;
  }

  return initial ?? [];
}

/** Prefer live context values; fall back to SSR snapshot when context is empty or missing. */
export function mergeLiveSnapshotSlice(
  live: LiveSnapshotSlice | null | undefined,
  initial: LiveSnapshotSlice
): {
  fixture: Fixture | null;
  events: FixtureEvent[];
  statistics: FixtureTeamStatistics[];
} {
  const fixture = live?.fixture ?? initial.fixture ?? null;
  const events = preferLiveArray(live?.events, initial.events);
  const statistics = preferLiveArray(live?.statistics, initial.statistics);

  return { fixture, events, statistics };
}
