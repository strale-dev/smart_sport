import { afterEach, describe, expect, it, vi } from "vitest";

import { LIVE_BROADCAST_EVENT } from "@/lib/live/channels";
import { subscribeMatchBroadcast } from "@/lib/live/subscribe-broadcast";

const handlers = new Map<string, (payload: unknown) => void>();
const channelMock = {
  on: vi.fn(
    (
      type: string,
      filter: { event: string },
      callback: (payload: unknown) => void
    ) => {
      if (type === "broadcast" && filter.event === LIVE_BROADCAST_EVENT) {
        handlers.set("broadcast", callback);
      }
      return channelMock;
    }
  ),
  subscribe: vi.fn((cb: (status: string) => void) => {
    cb("SUBSCRIBED");
    return channelMock;
  }),
  track: vi.fn(async () => undefined),
  untrack: vi.fn(async () => undefined),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => channelMock,
    removeChannel: vi.fn(),
  }),
}));

describe("subscribeMatchBroadcast", () => {
  afterEach(() => {
    handlers.clear();
    vi.clearAllMocks();
  });

  it("forwards broadcast payload to callback", () => {
    const onUpdate = vi.fn();
    const cleanup = subscribeMatchBroadcast(1035037, onUpdate);

    const payload = {
      fixtureProviderId: 1035037,
      syncedAt: "2026-09-12T12:00:00.000Z",
      source: "match" as const,
    };
    handlers.get("broadcast")?.({ payload });
    expect(onUpdate).toHaveBeenCalledWith(payload);

    cleanup();
    expect(channelMock.untrack).toHaveBeenCalled();
  });
});
