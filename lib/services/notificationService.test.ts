import { beforeEach, describe, expect, it, vi } from "vitest";

const broadcastMock = vi.fn();

vi.mock("@/lib/notifications/broadcaster", () => ({
  broadcastNewNotification: (...args: unknown[]) => broadcastMock(...args),
}));

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

describe("notificationService.enqueueNotification", () => {
  beforeEach(() => {
    broadcastMock.mockReset();
    fromMock.mockReset();
  });

  it("treats unique violation as duplicate no-op", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_preferences") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { notify_goal: true },
              }),
            }),
          }),
        };
      }

      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: "23505", message: "duplicate" },
            }),
          }),
        }),
      };
    });

    const { enqueueNotification } =
      await import("@/lib/services/notificationService");

    const result = await enqueueNotification({
      userId: "user-1",
      kind: "GOAL_FOR_FOLLOWED_TEAM",
      title: "Goal",
      dedupeKey: "GOAL_FOR_FOLLOWED_TEAM:fx:1",
    });

    expect(result).toEqual({
      ok: true,
      inserted: false,
      reason: "duplicate",
    });
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it("inserts and broadcasts on success", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_preferences") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { notify_goal: true },
              }),
            }),
          }),
        };
      }

      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "notif-1",
                created_at: "2026-01-01T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      };
    });

    const { enqueueNotification } =
      await import("@/lib/services/notificationService");

    const result = await enqueueNotification({
      userId: "user-1",
      kind: "GOAL_FOR_FOLLOWED_TEAM",
      title: "Goal",
    });

    expect(result).toMatchObject({
      ok: true,
      inserted: true,
      notificationId: "notif-1",
    });
    expect(broadcastMock).toHaveBeenCalledWith("user-1", {
      notificationId: "notif-1",
      kind: "GOAL_FOR_FOLLOWED_TEAM",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
