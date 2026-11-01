import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acquireLock,
  LockNotAcquiredError,
  releaseLock,
  resetMemoryLocksForTests,
  withLock,
  withRenewableLock,
} from "@/lib/redis/lock";

const getRedisMock = vi.hoisted(() => vi.fn<() => unknown>(() => null));

vi.mock("@/lib/redis/client", () => ({
  getRedis: () => getRedisMock(),
  resetRedisClientForTests: () => undefined,
  pingRedis: async () => false,
}));

function brokenRedisLockClient() {
  const transportError = new TypeError("fetch failed");
  return {
    get: vi.fn().mockRejectedValue(transportError),
    set: vi.fn().mockRejectedValue(transportError),
    del: vi.fn().mockRejectedValue(transportError),
    expire: vi.fn().mockRejectedValue(transportError),
  };
}

describe("lock (in-memory fallback)", () => {
  beforeEach(() => {
    resetMemoryLocksForTests();
    getRedisMock.mockReturnValue(null);
  });

  afterEach(() => {
    resetMemoryLocksForTests();
    getRedisMock.mockReturnValue(null);
    vi.restoreAllMocks();
  });

  it("acquires and releases a lock", async () => {
    expect(await acquireLock("lock:test:1", 5)).toBe(true);
    expect(await acquireLock("lock:test:1", 5)).toBe(false);
    await releaseLock("lock:test:1");
    expect(await acquireLock("lock:test:1", 5)).toBe(true);
  });

  it("runs fn inside withLock and releases afterward", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withLock("lock:test:2", 5, fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(await acquireLock("lock:test:2", 5)).toBe(true);
  });

  it("throws LockNotAcquiredError when lock is held", async () => {
    await acquireLock("lock:test:3", 5);

    await expect(
      withLock("lock:test:3", 5, async () => "blocked")
    ).rejects.toBeInstanceOf(LockNotAcquiredError);
  });

  it("serializes concurrent withLock calls on the same key", async () => {
    let active = 0;
    let maxActive = 0;

    const work = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return "done";
    };

    const results = await Promise.allSettled([
      withLock("lock:test:4", 5, work),
      withLock("lock:test:4", 5, work),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected")
    ).toHaveLength(1);
    expect(maxActive).toBe(1);
  });

  it("falls back to in-memory locks when Redis set throws", async () => {
    getRedisMock.mockReturnValue(brokenRedisLockClient());

    expect(await acquireLock("lock:test:redis-down", 5)).toBe(true);
    expect(await acquireLock("lock:test:redis-down", 5)).toBe(false);

    await releaseLock("lock:test:redis-down");
    expect(await acquireLock("lock:test:redis-down", 5)).toBe(true);
  });

  it("runs withLock when Redis transport fails", async () => {
    getRedisMock.mockReturnValue(brokenRedisLockClient());
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withLock("lock:test:redis-with-lock", 5, fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("renews lock during withRenewableLock", async () => {
    vi.useFakeTimers();

    const fn = vi.fn(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
      return "renewed";
    });

    const promise = withRenewableLock("lock:test:5", 2, 1_000, fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("renewed");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(await acquireLock("lock:test:5", 5)).toBe(true);

    vi.useRealTimers();
  });
});
