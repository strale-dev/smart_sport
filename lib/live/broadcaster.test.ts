import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __broadcastInternals,
  broadcastLiveFeedUpdate,
  broadcastMatchUpdate,
} from "@/lib/live/broadcaster";

vi.mock("@/lib/env.server", () => ({
  getServerEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  }),
}));

describe("broadcaster", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("broadcasts match update on match and live feed topics", async () => {
    await broadcastMatchUpdate(1035037, "2026-09-12T12:00:00.000Z");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      messages: Array<{ topic: string; event: string; payload: unknown }>;
    };

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]?.topic).toBe("match:1035037");
    expect(body.messages[1]?.topic).toBe("live:feed");
    expect(body.messages[0]?.event).toBe("update");
  });

  it("broadcasts live feed only for center updates", async () => {
    await broadcastLiveFeedUpdate("2026-09-12T12:00:00.000Z", "live-center");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      messages: Array<{ topic: string }>;
    };

    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.topic).toBe("live:feed");
  });

  it("does not throw when REST broadcast fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "error",
    });

    await expect(
      broadcastMatchUpdate(1, "2026-09-12T12:00:00.000Z")
    ).resolves.toBeUndefined();
  });

  it("postRealtimeBroadcastMessages throws on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });

    await expect(
      __broadcastInternals.postRealtimeBroadcastMessages([
        {
          topic: "live:feed",
          event: "update",
          payload: { syncedAt: "t", source: "live-center" },
        },
      ])
    ).rejects.toThrow(/realtime_broadcast_failed/);
  });
});
