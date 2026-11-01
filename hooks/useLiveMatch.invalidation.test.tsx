// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveMatch } from "@/hooks/useLiveMatch";
import { liveKeys } from "@/lib/live/query-keys";

const broadcastHandlerRef: {
  handler: ((payload: unknown) => void) | null;
} = { handler: null };

vi.mock("@/lib/live/subscribe-broadcast", () => ({
  subscribeMatchBroadcast: (
    _fixtureId: number,
    handler: (payload: unknown) => void
  ) => {
    broadcastHandlerRef.handler = handler;
    return () => {
      broadcastHandlerRef.handler = null;
    };
  },
}));

vi.mock("@/lib/live/watch-client", () => ({
  startLiveWatchSession: () => () => {},
}));

vi.mock("@/hooks/useDocumentVisible", () => ({
  useDocumentVisible: () => true,
}));

vi.mock("@/lib/live/live-fetch", () => ({
  fetchMatchSnapshot: vi.fn().mockResolvedValue({
    fixture: { status: "1H", externalId: 1001 },
    events: [],
    statistics: [],
  }),
}));

function LiveProbe({ fixtureId }: { fixtureId: number }) {
  useLiveMatch(fixtureId, "1H", {});
  return null;
}

describe("useLiveMatch AI invalidation", () => {
  beforeEach(() => {
    broadcastHandlerRef.handler = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not invalidate live insight on noop broadcast", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    render(
      <QueryClientProvider client={client}>
        <LiveProbe fixtureId={1001} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(broadcastHandlerRef.handler).toBeTruthy();
    });

    invalidateSpy.mockClear();

    broadcastHandlerRef.handler?.({
      meaningfulEvents: [],
      liveInsightGenerated: false,
    });

    const liveInvalidations = invalidateSpy.mock.calls.filter((call) => {
      const arg = call[0] as { queryKey?: readonly unknown[] };
      return (
        Array.isArray(arg.queryKey) && arg.queryKey.includes("live-insight")
      );
    });
    expect(liveInvalidations).toHaveLength(0);
  });

  it("invalidates live insight and delta on meaningful event", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    render(
      <QueryClientProvider client={client}>
        <LiveProbe fixtureId={1001} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(broadcastHandlerRef.handler).toBeTruthy();
    });

    invalidateSpy.mockClear();

    broadcastHandlerRef.handler?.({
      meaningfulEvents: [{ kind: "GOAL", fixtureProviderId: 1001 }],
      liveInsightGenerated: false,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: readonly unknown[] }).queryKey
    );
    expect(keys).toContainEqual(liveKeys.liveInsight(1001));
    expect(keys).toContainEqual(liveKeys.probabilityDelta(1001));
  });
});
