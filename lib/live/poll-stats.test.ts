import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(() => null),
  pingRedis: vi.fn(async () => false),
  resetRedisClientForTests: vi.fn(),
}));

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
    const day = new Date("2026-09-23T12:00:00Z");

    await incrementLivePollStat("fixture_poll_calls", 2, day);
    await incrementLivePollStat("fixture_poll_ingest", 1, day);

    const stats = await getLivePollStatsForDay(day);
    expect(stats.fixturePollCalls).toBe(2);
    expect(stats.fixturePollIngest).toBe(1);
  });
});
