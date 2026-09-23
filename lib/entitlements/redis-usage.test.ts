import { beforeEach, describe, expect, it, vi } from "vitest";

const pipelineExec = vi.fn().mockResolvedValue([]);
const pipeline = {
  hincrby: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  exec: pipelineExec,
};

const redisMock = {
  pipeline: vi.fn(() => pipeline),
  sadd: vi.fn().mockResolvedValue(1),
  hset: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  smembers: vi.fn().mockResolvedValue([]),
};

vi.mock("@/lib/redis/client", () => ({
  getRedis: () => redisMock,
}));

describe("incrementRedisUsageCounters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not exec counter pipeline when only liveFixtureUuid is set", async () => {
    const { incrementRedisUsageCounters } =
      await import("@/lib/entitlements/redis-usage");

    await incrementRedisUsageCounters(
      "user-1",
      { liveFixtureUuid: "fixture-uuid" },
      "2026-09-19"
    );

    expect(pipeline.hincrby).not.toHaveBeenCalled();
    expect(pipelineExec).toHaveBeenCalledTimes(1);
    expect(redisMock.sadd).toHaveBeenCalled();
  });

  it("does not exec when increment payload is empty", async () => {
    const { incrementRedisUsageCounters } =
      await import("@/lib/entitlements/redis-usage");

    await incrementRedisUsageCounters("user-1", {}, "2026-09-19");

    expect(pipeline.hincrby).not.toHaveBeenCalled();
    expect(pipelineExec).toHaveBeenCalledTimes(1);
  });
});
