import { beforeEach, describe, expect, it } from "vitest";

import {
  getLivePollStatsForDay,
  incrementLivePollStat,
  resetLivePollStatsMemoryForTests,
} from "@/lib/live/poll-stats";

describe("poll-stats", () => {
  beforeEach(() => {
    resetLivePollStatsMemoryForTests();
  });

  it("increments counters in memory when Redis is unavailable", async () => {
    await incrementLivePollStat("fixture_poll_calls", 2);
    await incrementLivePollStat("fixture_poll_ingest", 1);

    const stats = await getLivePollStatsForDay(
      new Date("2026-09-23T12:00:00Z")
    );
    expect(stats.fixturePollCalls).toBe(2);
    expect(stats.fixturePollIngest).toBe(1);
  });
});
