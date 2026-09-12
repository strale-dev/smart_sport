import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureWorkerRunning } from "@/lib/live/coordinator";
import { resetLiveViewersForTests } from "@/lib/live/viewers";
import { resetMemoryLocksForTests } from "@/lib/redis/lock";

const scheduleMatchPollTick = vi.fn();
const scheduleLiveCenterPollTick = vi.fn();

vi.mock("@/lib/live/poller", () => ({
  scheduleMatchPollTick: (...args: unknown[]) => scheduleMatchPollTick(...args),
  scheduleLiveCenterPollTick: (...args: unknown[]) =>
    scheduleLiveCenterPollTick(...args),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isLivePollingEnabled: () => true,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { status: "1H" } }),
        }),
      }),
    }),
  }),
}));

describe("live coordinator", () => {
  beforeEach(() => {
    resetLiveViewersForTests();
    resetMemoryLocksForTests();
    scheduleMatchPollTick.mockClear();
    scheduleLiveCenterPollTick.mockClear();
  });

  it("starts only one match worker when lock is held", async () => {
    const first = await ensureWorkerRunning("match", 1035037);
    const second = await ensureWorkerRunning("match", 1035037);

    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(scheduleMatchPollTick).toHaveBeenCalledTimes(1);
    expect(scheduleMatchPollTick).toHaveBeenCalledWith(1035037);
  });

  it("starts live-center worker once", async () => {
    const first = await ensureWorkerRunning("live-center");
    const second = await ensureWorkerRunning("live-center");

    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(scheduleLiveCenterPollTick).toHaveBeenCalledTimes(1);
  });
});
