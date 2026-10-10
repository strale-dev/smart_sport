import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();

const adminClient = {
  from: vi.fn((table: string) => {
    if (table !== "fixtures") {
      throw new Error(`Unexpected table ${table}`);
    }
    return {
      upsert: upsertMock,
    };
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => adminClient),
}));

describe("upsertFixtureRow", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    upsertMock.mockReturnValue({
      select: vi.fn(() => ({
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "same-uuid" }, error: null }),
      })),
    });
  });

  it("upserts on provider_id conflict without creating duplicates", async () => {
    const { upsertFixtureRow } = await import("@/lib/ingestion/upsert");
    const row = {
      provider_id: 999,
      league_id: "league",
      season_id: null,
      home_team_id: "home",
      away_team_id: "away",
      venue_id: null,
      round: null,
      referee: null,
      kickoff_at: "2026-10-01T15:00:00.000Z",
      status: "NS" as const,
      minute: null,
      score_home: null,
      score_away: null,
      ht_home: null,
      ht_away: null,
      ft_home: null,
      ft_away: null,
      et_home: null,
      et_away: null,
      pen_home: null,
      pen_away: null,
      status_extra_minute: null,
      period_first_start_at: null,
      period_second_start_at: null,
      last_provider_sync_at: "2026-10-01T12:00:00.000Z",
      provider_payload: null,
    };

    const first = await upsertFixtureRow(adminClient as never, row);
    const second = await upsertFixtureRow(adminClient as never, {
      ...row,
      status: "FT",
      score_home: 2,
      score_away: 1,
    });

    expect(first).toBe("same-uuid");
    expect(second).toBe("same-uuid");
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ onConflict: "provider_id" })
    );
  });
});
