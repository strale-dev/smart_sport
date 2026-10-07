import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FixtureEvent } from "@/types/domain";

const upsertMock = vi.fn();
const deleteMock = vi.fn();
const selectMock = vi.fn();

const fixtureEventsTable = {
  upsert: upsertMock,
  delete: deleteMock,
  select: selectMock,
};

const client = {
  from: vi.fn((table: string) => {
    if (table === "fixture_events") {
      return fixtureEventsTable;
    }
    if (table === "teams") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: "team-1" }, error: null }),
          })),
        })),
      };
    }
    if (table === "players") {
      return {
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "player-1" }, error: null }),
          })),
        })),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => client),
}));

describe("upsertFixtureEvents", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    selectMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "old-1", provider_event_id: "stale" }],
        error: null,
      }),
    });
  });

  it("does not delete existing events when policy disallows replace on empty payload", async () => {
    const { upsertFixtureEvents } =
      await import("@/lib/ingestion/match-details-upsert");

    const count = await upsertFixtureEvents(
      client as never,
      "fixture-uuid",
      [],
      { allowReplace: false }
    );

    expect(count).toBe(0);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("upserts duplicate events idempotently and removes orphans", async () => {
    const { upsertFixtureEvents } =
      await import("@/lib/ingestion/match-details-upsert");

    const event: FixtureEvent = {
      externalEventId: "1:10:0:Goal:33:909",
      minute: 10,
      extraMinute: null,
      teamExternalId: 33,
      playerExternalId: 909,
      assistPlayerExternalId: null,
      playerName: "Player",
      assistPlayerName: null,
      type: "Goal",
      detail: null,
      comments: null,
    };

    const first = await upsertFixtureEvents(client as never, "fixture-uuid", [
      event,
    ]);
    const second = await upsertFixtureEvents(client as never, "fixture-uuid", [
      event,
    ]);

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });
});
