import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiFootballQuotaError } from "@/lib/api-football/errors";
import {
  cached,
  readCacheEnvelopeForTests,
  resetCacheForTests,
  writeCacheEnvelopeForTests,
} from "@/lib/redis/cache";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";

describe("cached", () => {
  beforeEach(() => {
    resetCacheForTests();
    resetMemoryLocksForTests();
  });

  afterEach(() => {
    resetCacheForTests();
    resetMemoryLocksForTests();
    vi.restoreAllMocks();
  });

  it("returns fresh value on cache miss", async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1 });

    const result = await cached({
      key: "provider:test:miss",
      freshTtlSeconds: 60,
      staleTtlSeconds: 3600,
      fn,
    });

    expect(result.value).toEqual({ id: 1 });
    expect(result.meta.cached).toBe(false);
    expect(result.meta.stale).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns cached value on fresh hit", async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1 });

    await cached({
      key: "provider:test:hit",
      freshTtlSeconds: 60,
      staleTtlSeconds: 3600,
      fn,
    });

    const result = await cached({
      key: "provider:test:hit",
      freshTtlSeconds: 60,
      staleTtlSeconds: 3600,
      fn,
    });

    expect(result.value).toEqual({ id: 1 });
    expect(result.meta.cached).toBe(true);
    expect(result.meta.stale).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("deduplicates stampede on concurrent cache misses", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { id: calls };
    });

    const options = {
      key: "provider:test:stampede",
      freshTtlSeconds: 60,
      staleTtlSeconds: 3600,
      fn,
    };

    const results = await Promise.all([
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
      cached(options),
    ]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.value.id === 1)).toBe(true);
  });

  it("achieves >90% cache hit rate for repeated reads", async () => {
    const fn = vi.fn().mockResolvedValue({ fixtureId: 1035037 });
    const options = {
      key: "provider:test:hit-rate",
      freshTtlSeconds: 60,
      staleTtlSeconds: 3600,
      fn,
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () => cached(options))
    );

    const hits = results.filter((result) => result.meta.cached).length;
    expect(hits).toBeGreaterThanOrEqual(9);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache when quota is exhausted", async () => {
    await writeCacheEnvelopeForTests(
      "provider:test:stale",
      {
        value: { id: "stale" },
        cachedAt: new Date(Date.now() - 120_000).toISOString(),
      },
      3600
    );

    const fn = vi
      .fn()
      .mockRejectedValue(
        new ApiFootballQuotaError("API-Football daily quota is low")
      );

    const result = await cached({
      key: "provider:test:stale",
      freshTtlSeconds: 30,
      staleTtlSeconds: 3600,
      fn,
    });

    expect(result.value).toEqual({ id: "stale" });
    expect(result.meta.cached).toBe(true);
    expect(result.meta.stale).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rethrows quota error when no stale cache exists", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(
        new ApiFootballQuotaError("API-Football daily quota is low")
      );

    await expect(
      cached({
        key: "provider:test:no-stale",
        freshTtlSeconds: 30,
        staleTtlSeconds: 3600,
        fn,
      })
    ).rejects.toBeInstanceOf(ApiFootballQuotaError);
  });

  it("supports dynamic fresh ttl based on cached value", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ status: "LIVE" })
      .mockResolvedValueOnce({ status: "LIVE" });

    await cached({
      key: "provider:test:dynamic",
      freshTtlSeconds: (value: { status: string }) =>
        value.status === "LIVE" ? 45 : 600,
      staleTtlSeconds: 3600,
      fn,
    });

    const result = await cached({
      key: "provider:test:dynamic",
      freshTtlSeconds: (value: { status: string }) =>
        value.status === "LIVE" ? 45 : 600,
      staleTtlSeconds: 3600,
      fn,
    });

    expect(result.meta.cached).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);

    const envelope = await readCacheEnvelopeForTests<{ status: string }>(
      "provider:test:dynamic"
    );
    expect(envelope?.value.status).toBe("LIVE");
  });
});
