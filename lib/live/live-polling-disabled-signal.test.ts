import { beforeEach, describe, expect, it, vi } from "vitest";

const { logIngestionEvent } = vi.hoisted(() => ({
  logIngestionEvent: vi.fn(),
}));

vi.mock("@/lib/ingestion/ingestion-observability", () => ({
  logIngestionEvent,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            count: 3,
            error: null,
          }),
      }),
    }),
  }),
}));

import { emitLivePollingDisabledWhenLiveFixturesExist } from "@/lib/live/live-polling-disabled-signal";

describe("emitLivePollingDisabledWhenLiveFixturesExist", () => {
  beforeEach(() => {
    logIngestionEvent.mockClear();
  });

  it("logs when polling disabled and live fixtures exist", async () => {
    const result = await emitLivePollingDisabledWhenLiveFixturesExist({
      jobName: "sync-fixtures-today",
      env: { LIVE_POLLING_ENABLED: "false" },
    });

    expect(result).toEqual({ emitted: true, liveFixtureCount: 3 });
    expect(logIngestionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        job_name: "sync-fixtures-today",
        error_type: "live_polling_disabled",
        detail: { liveFixtureCount: 3 },
      })
    );
  });

  it("does not log when polling is enabled", async () => {
    const result = await emitLivePollingDisabledWhenLiveFixturesExist({
      jobName: "sync-fixtures-today",
      env: { LIVE_POLLING_ENABLED: "true" },
    });

    expect(result).toEqual({ emitted: false, liveFixtureCount: 0 });
    expect(logIngestionEvent).not.toHaveBeenCalled();
  });
});
