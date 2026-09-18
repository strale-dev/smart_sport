import { describe, expect, it } from "vitest";

import { mergeLiveSnapshotSlice } from "@/lib/live/merge-snapshot";
import type {
  Fixture,
  FixtureEvent,
  FixtureTeamStatistics,
} from "@/types/domain";

const fixture = { externalId: 1 } as Fixture;
const events = [{ id: "e1" }] as unknown as FixtureEvent[];
const statistics = [
  { teamExternalId: 10 },
] as unknown as FixtureTeamStatistics[];

describe("mergeLiveSnapshotSlice", () => {
  it("uses live values when present", () => {
    const liveEvents = [{ id: "live" }] as unknown as FixtureEvent[];
    const result = mergeLiveSnapshotSlice(
      { events: liveEvents, statistics: [], fixture },
      { events, statistics, fixture: null }
    );
    expect(result.events).toBe(liveEvents);
    expect(result.statistics).toBe(statistics);
    expect(result.fixture).toBe(fixture);
  });

  it("falls back to initial when live is null", () => {
    const result = mergeLiveSnapshotSlice(null, {
      events,
      statistics,
      fixture,
    });
    expect(result.events).toBe(events);
    expect(result.statistics).toBe(statistics);
    expect(result.fixture).toBe(fixture);
  });

  it("falls back when live omits arrays", () => {
    const result = mergeLiveSnapshotSlice({ fixture }, { events, statistics });
    expect(result.events).toBe(events);
    expect(result.statistics).toBe(statistics);
  });

  it("keeps initial arrays when live snapshot is empty", () => {
    const result = mergeLiveSnapshotSlice(
      { events: [], statistics: [], fixture },
      { events, statistics }
    );
    expect(result.events).toBe(events);
    expect(result.statistics).toBe(statistics);
  });
});
