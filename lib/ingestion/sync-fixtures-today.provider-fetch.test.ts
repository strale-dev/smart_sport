import { beforeEach, describe, expect, it, vi } from "vitest";

const { logIngestionEvent, apiFootballFetchAllPagesResponse } = vi.hoisted(
  () => ({
    logIngestionEvent: vi.fn(),
    apiFootballFetchAllPagesResponse: vi.fn(),
  })
);

vi.mock("@/lib/api-football/client", () => ({
  apiFootballFetchAllPagesResponse,
}));

vi.mock("@/lib/ingestion/throttle", () => ({
  throttleProviderRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/ingestion/ingestion-observability", () => ({
  logIngestionEvent,
}));

import { syncFixturesToday } from "@/lib/ingestion/sync-fixtures-today";

describe("syncFixturesToday provider fetch failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFootballFetchAllPagesResponse.mockRejectedValue(
      new TypeError("fetch failed")
    );
  });

  it("returns classified error_type and logs structured ingestion event", async () => {
    const result = await syncFixturesToday(
      new Date("2026-10-30T12:00:00.000Z")
    );

    expect(result.ok).toBe(false);
    expect(result.error_type).toBe("network");
    expect(result.retryable).toBe(true);
    expect(result.reason).toBe("fetch failed");

    expect(logIngestionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        job_name: "sync-fixtures-today",
        stage: "provider_fetch",
        ok: false,
        error_type: "network",
        retryable: true,
        provider_path: "/fixtures",
      })
    );
  });
});
