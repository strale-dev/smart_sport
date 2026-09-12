import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LIVE_PRESENCE_GRACE_MS } from "@/lib/live/constants";
import {
  countMatchWatchers,
  registerLiveWatch,
  resetLiveViewersForTests,
  shouldKeepMatchPollRunning,
  unregisterLiveWatch,
} from "@/lib/live/viewers";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  }),
}));

describe("live viewers (memory fallback)", () => {
  beforeEach(() => {
    resetLiveViewersForTests();
    resetMemoryLocksForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers and unregisters match watchers", async () => {
    const first = await registerLiveWatch({
      surface: "match",
      fixtureProviderId: 1035037,
    });
    const second = await registerLiveWatch({
      surface: "match",
      fixtureProviderId: 1035037,
    });

    expect(await countMatchWatchers(1035037)).toBe(2);

    await unregisterLiveWatch(first.watchToken);
    expect(await countMatchWatchers(1035037)).toBe(1);

    await unregisterLiveWatch(second.watchToken);
    expect(await countMatchWatchers(1035037)).toBe(0);
  });

  it("keeps poll running during grace after last unwatch", async () => {
    vi.useFakeTimers();

    const watch = await registerLiveWatch({
      surface: "match",
      fixtureProviderId: 999,
    });

    await unregisterLiveWatch(watch.watchToken);
    expect(await shouldKeepMatchPollRunning(999)).toBe(true);

    vi.advanceTimersByTime(LIVE_PRESENCE_GRACE_MS - 1);
    expect(await shouldKeepMatchPollRunning(999)).toBe(true);

    vi.advanceTimersByTime(2);
    expect(await shouldKeepMatchPollRunning(999)).toBe(false);
  });
});
