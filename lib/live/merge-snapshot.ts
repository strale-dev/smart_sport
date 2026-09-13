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
  const events = live?.events ?? initial.events ?? [];
  const statistics = live?.statistics ?? initial.statistics ?? [];

  return { fixture, events, statistics };
}
